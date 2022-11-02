import { harvestEnergyFromFranchise } from 'Behaviors/harvestEnergyFromFranchise';
import { HarvestLedger } from 'Ledger/HarvestLedger';
import { LogisticsLedger } from 'Ledger/LogisticsLedger';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { MultiCreepSpawner } from 'Missions/BaseClasses/CreepSpawner/MultiCreepSpawner';
import {
  BaseMissionData,
  MissionImplementation,
  ResolvedCreeps,
  ResolvedMissions
} from 'Missions/BaseClasses/MissionImplementation';
import { Budget } from 'Missions/Budgets';
import { adjacentWalkablePositions, moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { getFranchiseDistance } from 'Selectors/Franchises/getFranchiseDistance';
import { creepCost } from 'Selectors/minionCostPerTick';
import { posById } from 'Selectors/posById';
import { prespawnByArrived, setArrived } from 'Selectors/prespawn';
import { rcl } from 'Selectors/rcl';
import { sum } from 'Selectors/reducers';
import { getFranchisePlanBySourceId, getSpawns, roomPlans } from 'Selectors/roomPlans';
import { memoizeByTick } from 'utils/memoizeFunction';

export interface HarvestMissionData extends BaseMissionData {
  source: Id<Source>;
  arrived?: number;
  distance?: number;
}

export class HarvestMission extends MissionImplementation {
  public creeps = {
    harvesters: new MultiCreepSpawner(
      'h',
      this.missionData.office,
      {
        role: MinionTypes.SALESMAN,
        budget: Budget.ESSENTIAL,
        body: energy => MinionBuilders[MinionTypes.SALESMAN](energy, this.calculated().link, this.calculated().remote),
        count: current => {
          if (this.disabled()) {
            return 0; // disabled
          }
          const harvestRate = current
            .filter(prespawnByArrived)
            .map(c => c.getActiveBodyparts(WORK) * HARVEST_POWER)
            .reduce(sum, 0);
          if (harvestRate < 10 && current.length < this.calculated().maxHarvesters) {
            return 1;
          }
          return 0;
        }
      },
      creep =>
        HarvestLedger.record(this.missionData.office, this.missionData.source, 'spawn_harvest', -creepCost(creep))
    )
  };

  priority = 10;

  constructor(public missionData: HarvestMissionData, id?: string) {
    super(missionData, id);
    // Make sure that if room plans aren't finished we still prioritize the closest source
    const franchise1 =
      roomPlans(this.missionData.office)?.franchise1?.sourceId ??
      getSpawns(this.missionData.office)[0]?.pos.findClosestByRange(FIND_SOURCES)?.id;

    // set priority differently for remote sources
    const remote = this.missionData.office !== posById(this.missionData.source)?.roomName;
    const distance = getFranchiseDistance(this.missionData.office, this.missionData.source);
    this.missionData.distance = distance;
    if (remote) {
      this.priority = 1;
      if (distance) {
        // Increase priority for closer franchises, up to 1 point for closer than 50 squares
        // Round priority to two places
        this.priority += Math.round(100 * (Math.min(50, distance) / distance)) / 100;
      }
    } else {
      if (franchise1 === this.missionData.source) this.priority += 0.1;
    }
  }
  static fromId(id: HarvestMission['id']) {
    return super.fromId(id) as HarvestMission;
  }

  calculated = memoizeByTick(
    () => '',
    () => {
      return {
        link:
          !!getFranchisePlanBySourceId(this.missionData.source)?.link.structure ||
          getFranchisePlanBySourceId(this.missionData.source)?.extensions.some(s => s.structure),
        remote: posById(this.missionData.source)?.roomName !== this.missionData.office,
        maxHarvesters: adjacentWalkablePositions(posById(this.missionData.source)!, true).length,
        source: byId(this.missionData.source)
      };
    }
  );

  active() {
    return this.creeps.harvesters.resolved.length > 0;
  }
  disabled() {
    return this.missionData.distance && this.missionData.distance > 250;
  }

  haulingCapacityNeeded() {
    const { link, container } = getFranchisePlanBySourceId(this.missionData.source) ?? {};
    if (link?.structure && !container?.structure?.store.getUsedCapacity(RESOURCE_ENERGY)) return 0;
    const time = (this.missionData.distance ?? 50) * 2;
    return time * this.harvestRate();
  }

  harvestRate() {
    const pos = posById(this.missionData.source);
    if (
      ![undefined, 'LordGreywether'].includes(Memory.rooms[pos?.roomName ?? '']?.reserver) ||
      ![undefined, 'LordGreywether'].includes(Memory.rooms[pos?.roomName ?? '']?.owner)
    ) {
      return 0; // reserved or owned by someone else
    }
    const creepHarvestRate = this.creeps.harvesters.resolved
      .map(c => c.getActiveBodyparts(WORK) * HARVEST_POWER)
      .reduce(sum, 0);
    const maxHarvestRate =
      (byId(this.missionData.source)?.energyCapacity ?? SOURCE_ENERGY_NEUTRAL_CAPACITY) / ENERGY_REGEN_TIME;
    return Math.min(creepHarvestRate, maxHarvestRate);
  }

  run(creeps: ResolvedCreeps<HarvestMission>, missions: ResolvedMissions<HarvestMission>, data: HarvestMissionData) {
    const { harvesters } = creeps;
    const { source, office } = this.missionData;

    const container = getFranchisePlanBySourceId(source)?.container.structureId;
    LogisticsLedger.record(
      office,
      'decay',
      -Math.ceil(Math.max(0, franchiseEnergyAvailable(source) - (container ? 2000 : 0)) / 1000)
    );

    const franchisePos = posById(source);

    for (const creep of harvesters) {
      if ((franchisePos?.getRangeTo(creep.pos) ?? Infinity) <= 1) {
        const franchise = Memory.rooms[franchisePos!.roomName]?.franchises[office]?.[data.source];
        if (franchise) franchise.lastHarvested = Game.time;
        setArrived(creep);
      }

      if (
        creep.store.getCapacity(RESOURCE_ENERGY) &&
        creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) * 0.5
      ) {
        if (office === franchisePos?.roomName) {
          // Local franchise
          const plan = getFranchisePlanBySourceId(source);
          if (!plan) return;

          // Try to deposit at spawn
          let result: ScreepsReturnCode = ERR_FULL;
          for (const { structure } of plan.extensions) {
            if (!structure) continue;
            result = creep.transfer(structure, RESOURCE_ENERGY);
            if (result === OK) {
              const amount = Math.min(
                creep.store[RESOURCE_ENERGY],
                (structure as StructureExtension).store.getFreeCapacity(RESOURCE_ENERGY)
              );
              HarvestLedger.record(office, source, 'deposit', amount);
              LogisticsLedger.record(office, 'deposit', -amount);
              break;
            }
          }
          // Try to deposit at link
          if (result === ERR_FULL && plan.link.structure) {
            moveTo(creep, plan.link.pos);
            result = creep.transfer(plan.link.structure, RESOURCE_ENERGY);
            if (result === OK) {
              const amount = Math.min(
                creep.store[RESOURCE_ENERGY],
                (plan.link.structure as StructureLink).store.getFreeCapacity(RESOURCE_ENERGY)
              );
              HarvestLedger.record(office, source, 'deposit', amount);
              LogisticsLedger.record(office, 'deposit', -amount);
              // If we've dropped any resources, and there's space in the link, try to pick them up
              const resource = creep.pos.lookFor(LOOK_RESOURCES).find(r => r.resourceType === RESOURCE_ENERGY);
              if (resource) creep.pickup(resource);
            }
          }

          if (result === ERR_FULL && plan.container.structure) {
            result = creep.transfer(plan.container.structure, RESOURCE_ENERGY);
          }
        } else {
          // Remote franchise
          const plan = getFranchisePlanBySourceId(source);
          if (plan && Game.rooms[plan.container.pos.roomName] && rcl(office) >= 3) {
            // Try to build or repair container
            if (plan.container.structure && plan.container.structure.hits < plan.container.structure.hitsMax - 500) {
              if (creep.repair(plan.container.structure) === OK) {
                const amount = -(REPAIR_COST * REPAIR_POWER) * creep.body.filter(p => p.type === WORK).length;
                HarvestLedger.record(office, source, 'repair', amount);
                LogisticsLedger.record(office, 'deposit', amount);
                return;
              }
            }
          }
          if (
            plan?.container.structure &&
            creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) * 0.75
          ) {
            creep.transfer(plan.container.structure, RESOURCE_ENERGY);
          }
        }
      }

      const harvested = harvestEnergyFromFranchise(creep, source);
      if (harvested) {
        const amount = Math.min(
          byId(source)?.energy ?? 0,
          creep.body.filter(p => p.type === WORK).length * HARVEST_POWER,
          10
        );
        LogisticsLedger.record(office, 'harvest', amount);
      }
    }
  }
}
