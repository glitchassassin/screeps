import { deposit } from 'Behaviors/Logistics/deposit';
import { withdraw } from 'Behaviors/Logistics/withdraw';
import { isCloserToDestination } from 'Behaviors/followPathHomeFromSource';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { buildAccountant } from 'Minions/Builds/accountant';
import { MinionTypes } from 'Minions/minionTypes';
import { fixedCount } from 'Missions/BaseClasses';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { activeMissions, isMission } from 'Missions/Selectors';
import { combatPower } from 'Selectors/Combat/combatStats';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { franchiseCapacity } from 'Selectors/Franchises/franchiseIncome';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { getFranchiseDistance } from 'Selectors/Franchises/getFranchiseDistance';
import { estimatedFreeCapacity, estimatedUsedCapacity, updateUsedCapacity } from 'Selectors/Logistics/predictiveCapacity';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { byId } from 'Selectors/byId';
import { creepCost } from 'Selectors/minionCostPerTick';
import { plannedActiveFranchiseRoads } from 'Selectors/plannedActiveFranchiseRoads';
import { rcl } from 'Selectors/rcl';
import { sum } from 'Selectors/reducers';
import { roomPlans } from 'Selectors/roomPlans';
import { storageStructureThatNeedsEnergy } from 'Selectors/storageStructureThatNeedsEnergy';
import { franchiseIsThreatened } from 'Strategy/Territories/HarassmentZones';
import { memoizeByTick, memoizeOnce, memoizeOncePerTick } from 'utils/memoizeFunction';
import { HarvestMission } from './HarvestMission';

export interface LogisticsMissionData extends BaseMissionData {
  assignments?: Record<
    string,
    {
      withdrawTarget?: Id<Source>;
      depositTarget?: Id<AnyStoreStructure | Creep>;
      fromStorage?: boolean;
    }
  >;
}

declare global {
  interface CreepMemory {
    fromStorage?: boolean;
  }
}

export class LogisticsMission extends MissionImplementation {
  public creeps = {
    refillers: new MultiCreepSpawner('r', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      spawnData: {
        memory: { fromStorage: true }
      },
      budget: Budget.ESSENTIAL,
      estimatedCpuPerTick: 0.8,
      builds: energy =>
        buildAccountant(Math.max(100, energy / 2), 25, this.calculated().roads, this.calculated().repair),
      count: fixedCount(() =>
        roomPlans(this.missionData.office)?.headquarters?.storage.structure?.store.getUsedCapacity(RESOURCE_ENERGY)
          ? 1
          : 0
      )
    }),
    haulers: new MultiCreepSpawner('h', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      spawnData: {
        memory: { fromStorage: false }
      },
      budget: Budget.ESSENTIAL,
      estimatedCpuPerTick: 2,
      builds: energy =>
        buildAccountant(Math.max(100, energy / 2), 25, this.calculated().roads, this.calculated().repair),
      count: current => {
        const neededCapacity = franchiseCapacity(this.missionData.office);
        const currentCapacity = current.map(c => combatPower(c).carry).reduce(sum, 0);
        if (currentCapacity < neededCapacity) return 1;
        return 0;
      }
    })
  };

  priority = 11;

  constructor(public missionData: LogisticsMissionData, id?: string) {
    super(missionData, id);
  }
  static fromId(id: LogisticsMission['id']) {
    return super.fromId(id) as LogisticsMission;
  }

  capacity = memoizeOncePerTick(
    () => {
      return this.creeps.haulers.resolved.map(c => c.store.getCapacity()).reduce(sum, 0);
    }
  );

  creepCost = memoizeOncePerTick(
    () => {
      return this.creeps.haulers.resolved.map(creepCost).reduce(sum, 0);
    }
  );

  usedCapacity = memoizeOncePerTick(
    () => {
      return this.creeps.haulers.resolved.map(c => estimatedUsedCapacity(c)).reduce(sum, 0);
    }
  );

  withdrawLedger = new Map<Id<Source>, number>();
  depositLedger = new Map<Id<AnyStoreStructure | Creep>, number>();
  depositLedgerPriority = new Map<Id<AnyStoreStructure | Creep>, number>();
  recalculateAssignmentLedgers = memoizeOnce(() => {
    this.depositLedgerPriority.clear();
    const priorities = storageStructureThatNeedsEnergy(this.missionData.office).sort((a, b) => b[0] - a[0]);

    priorities.forEach(([priority, structure]) => {
      this.depositLedgerPriority.set(structure.id as Id<AnyStoreStructure | Creep>, priority);
    });

    for (const { source } of franchisesByOffice(this.missionData.office)) {
      if (franchiseIsThreatened(this.missionData.office, source)) {
        this.withdrawLedger.delete(source);
        continue;
      }
      this.withdrawLedger.set(source, 0);
    }

    for (const assigned in this.missionData.assignments) {
      const assignment = this.missionData.assignments[assigned];
      const creep = Game.creeps[assigned];
      if (!creep) continue;
      if (creep.memory.runState === States.WITHDRAW && assignment.withdrawTarget) {
        this.withdrawLedger.set(
          assignment.withdrawTarget as Id<Source>,
          (this.withdrawLedger.get(assignment.withdrawTarget as Id<Source>) ?? 0) + estimatedFreeCapacity(creep)
        );
      }
      if (creep.memory.runState === States.DEPOSIT && assignment.depositTarget) {
        let target = byId(assignment.depositTarget);
        if (!target) continue;
        if (priorities.length) {
          const [bestPriority, bestTarget] = priorities[0];
          if (bestTarget instanceof StructureStorage && creep.memory.fromStorage) continue; // don't assign refillers to storage
          const actualPriority = priorities.find(([priority, structure]) => structure.id === target!.id)?.[0] ?? 0;
          if (actualPriority < bestPriority) {
            const assignedToBestTarget = this.depositLedger.get(bestTarget.id) ?? 0;
            assignment.depositTarget = bestTarget.id;
            target = bestTarget;
            if (
              estimatedUsedCapacity(creep) + assignedToBestTarget >=
              estimatedFreeCapacity(bestTarget)
            ) {
              priorities.shift(); // fully assigned
            }
          }
        }
        this.depositLedger.set(
          assignment.depositTarget,
          Math.min(
            estimatedFreeCapacity(target),
            (this.depositLedger.get(assignment.depositTarget) ?? 0) + estimatedUsedCapacity(creep)
          )
        );
      }
    }
  }, 10);

  findBestDepositTarget(creep: Creep, ignoreStorage = false, assign = true) {
    this.recalculateAssignmentLedgers();
    if (!ignoreStorage && Game.cpu.bucket < 10000) {
      // optimization to deliver everything to storage when low on CPU
      const storage = roomPlans(this.missionData.office)?.headquarters?.storage.structure;
      if (storage) return storage.id;
    }
    let bestTarget = undefined;
    let bestAmount = -Infinity;
    let bestPriority = 0;
    let bestDistance = Infinity;
    const structures = [...this.depositLedgerPriority.entries()].sort((a, b) => b[1] - a[1]);
    for (const [targetId, priority] of structures) {
      if (priority < bestPriority) break; // we've already found a target that's better than this one
      const target = byId(targetId);
      if (!target || (target instanceof StructureStorage && ignoreStorage)) continue;
      const capacity = this.depositLedger.get(targetId) ?? 0;
      const freeCapacity = estimatedFreeCapacity(target);
      if (!freeCapacity) continue;
      const amount = freeCapacity - capacity;
      const distance = getRangeTo(creep.pos, target.pos);
      if (
        (distance < bestDistance &&
          amount >= Math.min(bestAmount, estimatedFreeCapacity(creep))) ||
        (amount > bestAmount && bestAmount < estimatedFreeCapacity(creep))
      ) {
        bestTarget = target.id;
        bestAmount = amount;
        bestDistance = distance;
        bestPriority = priority;
      }
    }

    if (assign && bestTarget) {
      const capacity = this.depositLedger.get(bestTarget) ?? 0;
      this.depositLedger.set(bestTarget, capacity + estimatedUsedCapacity(creep));
    }
    return bestTarget;
  }

  findBestWithdrawTarget(creep: Creep, assign = true) {
    this.recalculateAssignmentLedgers();
    const maxDistance = (creep.ticksToLive ?? CREEP_LIFE_TIME) * 0.8;
    let bestTarget = undefined;
    let bestCreepAmount = 0;
    let bestTotalAmount = 0;
    let bestDistance = Infinity;
    for (const [source, capacity] of this.withdrawLedger) {
      // total stockpile at the source
      const totalAmount = franchiseEnergyAvailable(source);
      // total this creep can get (after reservations)
      const creepAmount = Math.max(0, Math.min(totalAmount - capacity, estimatedFreeCapacity(creep)));
      if (creepAmount === 0) continue;

      const distance = getFranchiseDistance(this.missionData.office, source) ?? Infinity;
      if (distance * 2 > maxDistance) continue; // too far for this creep to survive
      if (creepAmount > bestCreepAmount || (creepAmount === bestCreepAmount && distance < bestDistance)) {
        bestTarget = source;
        bestCreepAmount = creepAmount;
        bestTotalAmount = totalAmount;
        bestDistance = distance;
      }
    }
    if (assign && bestTarget) {
      this.withdrawLedger.set(
        bestTarget,
        (this.withdrawLedger.get(bestTarget) ?? 0) + estimatedFreeCapacity(creep)
      );
    }
    return bestTarget;
  }

  calculated = memoizeByTick(
    () => '',
    () => {
      if (rcl(this.missionData.office) <= 3) {
        return {
          roads: false,
          repair: false
        };
      }
      let roads = true;
      let repair = false;
      for (const r of plannedActiveFranchiseRoads(this.missionData.office)) {
        roads &&= r.energyToBuild === 0; // all roads should be built
        repair ||= r.energyToRepair >= (ROAD_HITS / 2) * REPAIR_COST; // any roads may need repairs
        if (!roads && repair) break; // no need to scan further, results won't change
      }
      return {
        roads,
        repair: repair && Game.cpu.bucket === 10000 // don't repair if we're dipping into bucket
      };
    }
  );

  updatePriorities = memoizeOnce(() => {
    // Update priorities
    const inRoomCapacity = activeMissions(this.missionData.office)
      .filter(isMission(HarvestMission))
      .filter(m => !m.calculated().remote)
      .map(m => m.haulingCapacityNeeded())
      .reduce(sum, 0);

    const refillersNeeded =
      this.creeps.refillers.resolved.length === 0 &&
      estimatedUsedCapacity(roomPlans(this.missionData.office)?.headquarters?.storage.structure);

    if (
      !refillersNeeded &&
      inRoomCapacity < this.creeps.haulers.resolved.map(h => h.store.getCapacity(RESOURCE_ENERGY)).reduce(sum, 0)
    ) {
      this.priority = 3;
    } else {
      this.priority = 11;
    }
  }, 100);

  run(
    creeps: ResolvedCreeps<LogisticsMission>,
    missions: ResolvedMissions<LogisticsMission>,
    data: LogisticsMissionData
  ) {
    const { haulers, refillers } = creeps;
    const allHaulers = [...haulers, ...refillers];
    data.assignments ??= {};

    this.updatePriorities();

    // clean up invalid assignments
    for (const assigned in this.missionData.assignments) {
      const assignment = this.missionData.assignments[assigned];
      const creep = Game.creeps[assigned];
      if (!creep) {
        delete this.missionData.assignments[assigned];
        continue;
      }
      if (creep?.memory.runState === States.DEPOSIT) {
        if (estimatedUsedCapacity(creep) === 0) {
          // creep is empty
          creep.memory.runState = States.WITHDRAW;
          delete assignment.withdrawTarget;
          delete assignment.depositTarget;
        } else if (assignment.depositTarget && !estimatedFreeCapacity(byId(assignment.depositTarget))) {
          // deposit target is full
          if (this.depositLedger.has(assignment.depositTarget)) {
            this.depositLedger.set(
              assignment.depositTarget,
              Math.max(
                0,
                (this.depositLedger.get(assignment.depositTarget) ?? 0) - estimatedUsedCapacity(creep)
              )
            );
          }
          delete assignment.depositTarget;
        }
      } else if (creep?.memory.runState === States.WITHDRAW) {
        if (estimatedFreeCapacity(creep) === 0) {
          // creep is full
          delete assignment.depositTarget;
          creep.memory.runState = States.DEPOSIT;
        } else if (assignment.withdrawTarget) {
          const target = byId(assignment.withdrawTarget as Id<Source | StructureStorage | StructureContainer>);
          if (
            (
              (target instanceof StructureStorage || target instanceof StructureContainer) &&
              estimatedUsedCapacity(target) <= 0
            ) ||
            franchiseEnergyAvailable(assignment.withdrawTarget) <= 50
          ) {
            // withdraw target is empty
            if (this.withdrawLedger.has(assignment.withdrawTarget)) {
              this.withdrawLedger.set(
                assignment.withdrawTarget,
                Math.max(0, (this.withdrawLedger.get(assignment.withdrawTarget) ?? 0) - estimatedFreeCapacity(creep))
              );
            }
            delete assignment.withdrawTarget;
            if (estimatedUsedCapacity(creep) > 0) {
              // creep has something to drop off
              creep.memory.runState = States.DEPOSIT;
            }
          }
        }
      }
    }

    // add targets, if needed

    for (const creep of allHaulers) {
      data.assignments[creep.name] ??= {};
      const assignment = data.assignments[creep.name];
      if (
        creep?.memory.runState === States.DEPOSIT &&
        !assignment.depositTarget &&
        creep.pos.roomName === this.missionData.office // wait to set deposit target until creep is in office
      ) {
        assignment.depositTarget = this.findBestDepositTarget(creep, creep.memory.fromStorage, true);
      } else if (
        creep?.memory.runState === States.WITHDRAW &&
        !assignment.withdrawTarget &&
        !creep.memory.fromStorage
      ) {
        assignment.withdrawTarget = this.findBestWithdrawTarget(creep, true);
      }
    }

    // check for bucket brigade transfers

    const hasBrigaded = new Set<Creep>();
    for (const creep1 of haulers) {
      if (hasBrigaded.has(creep1)) continue; // already done
      for (const creep2 of creep1.pos.findInRange(FIND_MY_CREEPS, 1)) {
        if (hasBrigaded.has(creep2) || !haulers.includes(creep2)) continue;
        // adjacent logistics minion
        let withdraw, deposit;
        if (creep1.memory.runState === States.DEPOSIT && creep2.memory.runState === States.WITHDRAW) {
          withdraw = creep2;
          deposit = creep1;
        } else if (creep2.memory.runState === States.DEPOSIT && creep1.memory.runState === States.WITHDRAW) {
          withdraw = creep1;
          deposit = creep2;
        } else {
          continue;
        }

        if (estimatedFreeCapacity(withdraw) < estimatedUsedCapacity(deposit)) continue;

        const withdrawAssignment = data.assignments[withdraw.name];
        const depositAssignment = data.assignments[deposit.name];

        const target = byId(depositAssignment.depositTarget);
        if (!target || target instanceof Creep) continue;

        // check if target creep is closer
        if (!isCloserToDestination(
          deposit,
          withdraw,
          this.missionData.office,
          depositAssignment.withdrawTarget
        )) continue;

        // clear to swap
        if (deposit.transfer(withdraw, RESOURCE_ENERGY) === OK) {
          withdraw.memory.runState = States.DEPOSIT;
          deposit.memory.runState = States.WITHDRAW;
          data.assignments[withdraw.name] = depositAssignment;
          data.assignments[deposit.name] = withdrawAssignment;
          updateUsedCapacity(withdraw, estimatedUsedCapacity(deposit));
          updateUsedCapacity(deposit, -estimatedUsedCapacity(deposit));
          hasBrigaded.add(withdraw);
          hasBrigaded.add(deposit);
        }
      }
    }

    this.logCpu("overhead");

    for (const creep of allHaulers) {
      runStates(
        {
          [States.DEPOSIT]: deposit(creep.memory.fromStorage),
          [States.WITHDRAW]: withdraw(creep.memory.fromStorage),
          [States.RECYCLE]: recycle
        },
        { assignment: data.assignments[creep.name], office: data.office },
        creep,
        // { cpu: true }
      );
    }

    this.logCpu("creeps");
  }
}
