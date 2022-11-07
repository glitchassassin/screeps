import { deposit } from 'Behaviors/Logistics/deposit';
import { withdraw } from 'Behaviors/Logistics/withdraw';
import { recycle } from 'Behaviors/recycle';
import { runStates } from 'Behaviors/stateMachine';
import { States } from 'Behaviors/states';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { activeMissions, isMission } from 'Missions/Selectors';
import { byId } from 'Selectors/byId';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { franchisesThatNeedRoadWork } from 'Selectors/Franchises/franchisesThatNeedRoadWork';
import { getFranchiseDistance } from 'Selectors/Franchises/getFranchiseDistance';
import { getRangeTo } from 'Selectors/Map/MapCoordinates';
import { plannedTerritoryRoads } from 'Selectors/plannedTerritoryRoads';
import { rcl } from 'Selectors/rcl';
import { sum } from 'Selectors/reducers';
import { storageStructureThatNeedsEnergy } from 'Selectors/storageStructureThatNeedsEnergy';
// import { logCpu, logCpuStart } from 'utils/logCPU';
import { memoizeByTick } from 'utils/memoizeFunction';
import { HarvestMission } from './HarvestMission';

export interface LogisticsMissionData extends BaseMissionData {
  assignments?: Record<
    string,
    {
      withdrawTarget?: Id<Source>;
      depositTarget?: Id<AnyStoreStructure | Creep>;
      repair?: boolean;
    }
  >;
}

export class LogisticsMission extends MissionImplementation {
  public creeps = {
    haulers: new MultiCreepSpawner('h', this.missionData.office, {
      role: MinionTypes.ACCOUNTANT,
      budget: Budget.ESSENTIAL,
      estimatedCpuPerTick: 0.8,
      body: energy =>
        MinionBuilders[MinionTypes.ACCOUNTANT](
          Math.max(100, energy / 2),
          25,
          this.calculated().roads,
          this.calculated().repair
        ),
      count: current => {
        const neededCapacity = activeMissions(this.missionData.office)
          .filter(isMission(HarvestMission))
          .map(m => m.haulingCapacityNeeded())
          .reduce(sum, 0);
        const currentCapacity = current.map(c => c.store.getCapacity()).reduce(sum, 0);
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

  capacity = memoizeByTick(
    () => '',
    () => {
      return this.creeps.haulers.resolved.map(c => c.store.getCapacity()).reduce(sum, 0);
    }
  );

  usedCapacity = memoizeByTick(
    () => '',
    () => {
      return this.creeps.haulers.resolved.map(c => c.store.getUsedCapacity(RESOURCE_ENERGY)).reduce(sum, 0);
    }
  );

  assignedLogisticsCapacity = memoizeByTick(
    () => '',
    () => {
      const withdrawAssignments = new Map<Id<Source>, number>();
      const depositAssignments = new Map<[number, AnyStoreStructure | Creep], number>();
      const depositAssignmentIds = new Map<Id<AnyStoreStructure | Creep>, [number, AnyStoreStructure | Creep]>();

      for (const { source, room } of franchisesByOffice(this.missionData.office)) {
        if ((Memory.rooms[room]?.threatLevel?.[1] ?? 0) > 0) continue;
        withdrawAssignments.set(source, 0);
      }
      for (const prioritizedStructure of storageStructureThatNeedsEnergy(this.missionData.office)) {
        depositAssignments.set(prioritizedStructure, 0);
        depositAssignmentIds.set(prioritizedStructure[1].id, prioritizedStructure);
      }

      for (const assigned in this.missionData.assignments) {
        const assignment = this.missionData.assignments[assigned];
        const creep = Game.creeps[assigned];
        if (!creep) continue;
        if (
          creep.memory.runState === States.WITHDRAW &&
          assignment.withdrawTarget &&
          withdrawAssignments.has(assignment.withdrawTarget as Id<Source>)
        ) {
          withdrawAssignments.set(
            assignment.withdrawTarget as Id<Source>,
            (withdrawAssignments.get(assignment.withdrawTarget as Id<Source>) ?? 0) + creep.store.getFreeCapacity()
          );
        }
        if (
          creep.memory.runState === States.DEPOSIT &&
          assignment.depositTarget &&
          depositAssignmentIds.has(assignment.depositTarget)
        ) {
          const target = depositAssignmentIds.get(assignment.depositTarget);
          if (!target) continue;
          depositAssignments.set(
            target,
            Math.min(
              target[1].store.getFreeCapacity(RESOURCE_ENERGY),
              (depositAssignments.get(target) ?? 0) + creep.store[RESOURCE_ENERGY]
            )
          );
        }
      }

      return { withdrawAssignments, depositAssignments, depositAssignmentIds };
    }
  );

  findBestDepositTarget(creep: Creep, ignoreStorage = false, assign = true) {
    const { depositAssignments } = this.assignedLogisticsCapacity();
    let bestTarget = undefined;
    let bestAmount = -Infinity;
    let bestPriority = 0;
    let bestDistance = Infinity;
    for (const [prioritizedStructure, capacity] of depositAssignments) {
      const [priority, target] = prioritizedStructure;
      if (target instanceof StructureStorage && ignoreStorage) continue;
      const amount = (target.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) - capacity;
      const distance = getRangeTo(creep.pos, target.pos);
      if (
        priority > bestPriority ||
        (priority === bestPriority &&
          distance < bestDistance &&
          amount >= Math.min(bestAmount, creep.store.getFreeCapacity(RESOURCE_ENERGY))) ||
        (priority === bestPriority && amount > bestAmount && bestAmount < creep.store.getFreeCapacity(RESOURCE_ENERGY))
      ) {
        bestTarget = prioritizedStructure;
        bestAmount = amount;
        bestDistance = distance;
        bestPriority = priority;
      }
    }

    if (assign && bestTarget) {
      depositAssignments.set(bestTarget, (depositAssignments.get(bestTarget) ?? 0) + creep.store[RESOURCE_ENERGY]);
    }
    return bestTarget;
  }

  findBestWithdrawTarget(creep: Creep, assign = true) {
    const { withdrawAssignments } = this.assignedLogisticsCapacity();
    const maxDistance = (creep.ticksToLive ?? CREEP_LIFE_TIME) * 0.8;
    let bestTarget = undefined;
    let bestCreepAmount = 0;
    let bestTotalAmount = 0;
    let bestDistance = Infinity;
    for (const [source, capacity] of withdrawAssignments) {
      // total stockpile at the source
      const totalAmount = franchiseEnergyAvailable(source);
      // total this creep can get (after reservations)
      const creepAmount = Math.min(totalAmount - capacity, creep.store.getFreeCapacity(RESOURCE_ENERGY));
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
      withdrawAssignments.set(
        bestTarget,
        (withdrawAssignments.get(bestTarget) ?? 0) + creep.getActiveBodyparts(CARRY) * CARRY_CAPACITY
      );
    }
    return bestTarget;
  }

  calculated = memoizeByTick(
    () => '',
    () => {
      return {
        roads: rcl(this.missionData.office) > 3 && franchisesThatNeedRoadWork(this.missionData.office).length <= 2,
        repair:
          rcl(this.missionData.office) > 3 &&
          plannedTerritoryRoads(this.missionData.office).some(r => r.energyToRepair > 0)
      };
    }
  );

  fromStorage = false;

  run(
    creeps: ResolvedCreeps<LogisticsMission>,
    missions: ResolvedMissions<LogisticsMission>,
    data: LogisticsMissionData
  ) {
    const { haulers } = creeps;
    data.assignments ??= {};

    // Update priorities
    const inRoomCapacity = activeMissions(this.missionData.office)
      .filter(isMission(HarvestMission))
      .filter(m => !m.calculated().remote)
      .map(m => m.haulingCapacityNeeded())
      .reduce(sum, 0);

    if (inRoomCapacity < haulers.map(h => h.store.getCapacity(RESOURCE_ENERGY)).reduce(sum, 0)) {
      this.priority = 3;
    } else {
      this.priority = 11;
    }

    // logCpuStart();

    // clean up invalid assignments
    const { depositAssignmentIds } = this.assignedLogisticsCapacity();
    for (const assigned in this.missionData.assignments) {
      const assignment = this.missionData.assignments[assigned];
      const creep = Game.creeps[assigned];
      if (!creep) {
        delete this.missionData.assignments[assigned];
        continue;
      }
      if (
        creep?.memory.runState === States.DEPOSIT &&
        assignment.depositTarget &&
        !depositAssignmentIds.has(assignment.depositTarget)
      ) {
        delete assignment.depositTarget;
      } else if (creep?.memory.runState === States.WITHDRAW && assignment.withdrawTarget) {
        const target = byId(assignment.withdrawTarget as Id<Source | StructureStorage | StructureContainer>);
        if (target instanceof StructureStorage || target instanceof StructureContainer) {
          if (target.store[RESOURCE_ENERGY] < 0) {
            // withdraw target is empty
            delete assignment.withdrawTarget;
          }
        } else if (franchiseEnergyAvailable(assignment.withdrawTarget) <= 50) {
          delete assignment.withdrawTarget;
        }
      }
    }
    // logCpu('cleanup');

    // add targets, if needed

    for (const creep of haulers) {
      data.assignments[creep.name] ??= {};
      const assignment = data.assignments[creep.name];
      if (creep?.memory.runState === States.DEPOSIT && !assignment.depositTarget) {
        assignment.depositTarget = this.findBestDepositTarget(creep, this.fromStorage, true)?.[1].id;
      } else if (creep?.memory.runState === States.WITHDRAW && !assignment.withdrawTarget && !this.fromStorage) {
        assignment.withdrawTarget = this.findBestWithdrawTarget(creep, true);
      }
    }
    // logCpu('add targets');

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

        if (withdraw.store.getFreeCapacity() < deposit.store[RESOURCE_ENERGY]) continue;

        const withdrawAssignment = data.assignments[withdraw.name];
        const depositAssignment = data.assignments[deposit.name];

        const target = byId(depositAssignment.depositTarget);
        if (!target || target instanceof Creep) continue;
        const targetPos = target.pos;

        if (getRangeTo(withdraw.pos, targetPos) >= getRangeTo(deposit.pos, targetPos)) continue;

        // clear to swap
        if (deposit.transfer(withdraw, RESOURCE_ENERGY) === OK) {
          withdraw.memory.runState = States.DEPOSIT;
          deposit.memory.runState = States.WITHDRAW;
          data.assignments[withdraw.name] = depositAssignment;
          data.assignments[deposit.name] = withdrawAssignment;
          withdraw.store[RESOURCE_ENERGY] += deposit.store[RESOURCE_ENERGY];
          deposit.store[RESOURCE_ENERGY] = 0;
          hasBrigaded.add(withdraw);
          hasBrigaded.add(deposit);
        }
      }
    }
    // logCpu('bucket brigade');

    for (const creep of haulers) {
      const assignment = {
        ...data.assignments[creep.name],
        office: data.office
      };
      runStates(
        {
          [States.DEPOSIT]: deposit,
          [States.WITHDRAW]: withdraw(this.fromStorage),
          [States.RECYCLE]: recycle
        },
        assignment,
        creep
      );
      // logCpu('run creeps');
    }
  }
}
