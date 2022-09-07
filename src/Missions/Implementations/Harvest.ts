import { harvestEnergyFromFranchise } from 'Behaviors/harvestEnergyFromFranchise';
import { HarvestLedger } from 'Ledger/HarvestLedger';
import { LogisticsLedger } from 'Ledger/LogisticsLedger';
import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { scheduleSpawn } from 'Minions/spawnQueues';
import { createMission, Mission, MissionType } from 'Missions/Mission';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { getFranchiseDistance } from 'Selectors/Franchises/getFranchiseDistance';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { creepCost, minionCost } from 'Selectors/minionCostPerTick';
import { posById } from 'Selectors/posById';
import { rcl } from 'Selectors/rcl';
import { getFranchisePlanBySourceId, getSpawns, roomPlans } from 'Selectors/roomPlans';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';
import { MissionImplementation } from './MissionImplementation';

export interface HarvestMission extends Mission<MissionType.HARVEST> {
  data: {
    source: Id<Source>;
    arrived?: number;
    distance?: number;
    harvestRate: number;
  };
}

export function createHarvestMission(office: string, source: Id<Source>, startTime?: number): HarvestMission {
  const body = MinionBuilders[MinionTypes.SALESMAN](spawnEnergyAvailable(office));
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body)
  };

  // Make sure that if room plans aren't finished we still prioritize the closest source
  const franchise1 =
    roomPlans(office)?.franchise1?.sourceId ?? getSpawns(office)[0]?.pos.findClosestByRange(FIND_SOURCES)?.id;

  // set priority differently for remote sources
  const remote = office !== posById(source)?.roomName;
  const distance = getFranchiseDistance(office, source);
  let priority = 10;
  if (remote) {
    priority = 1;
    if (distance) {
      // Increase priority for closer franchises, up to 1 point for closer than 50 squares
      // Round priority to two places
      priority += Math.round(100 * (Math.min(50, distance) / distance)) / 100;
    }
  } else {
    if (franchise1 === source) priority += 0.1;
  }

  return createMission({
    office,
    priority,
    type: MissionType.HARVEST,
    startTime,
    data: {
      source,
      distance,
      harvestRate: body.filter(t => t === WORK).length * HARVEST_POWER
    },
    estimate
  });
}

export class Harvest extends MissionImplementation {
  static spawn(mission: HarvestMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Calculate harvester spawn preference
    const franchisePlan = getFranchisePlanBySourceId(mission.data.source);
    const link = !!franchisePlan?.link.structure || franchisePlan?.extensions.some(e => e.structure);
    const remote = posById(mission.data.source)?.roomName !== mission.office;

    const energy = hasEnergyIncome(mission.office)
      ? Game.rooms[mission.office].energyCapacityAvailable
      : spawnEnergyAvailable(mission.office);

    // Set name
    const name = `HARVEST-${mission.office}-${mission.id}`;
    const body = MinionBuilders[MinionTypes.SALESMAN](energy, link, remote);

    scheduleSpawn(
      mission.office,
      mission.priority,
      {
        name,
        body
      },
      mission.startTime
    );

    mission.creepNames.push(name);
  }

  static onStart(mission: HarvestMission, creep: Creep) {
    // HarvestLedger.reset(mission.office, mission.data.source);
    HarvestLedger.record(mission.office, mission.data.source, 'spawn_harvest', -creepCost(creep));
  }

  static onEnd(mission: HarvestMission) {
    // console.log(
    //   mission.office,
    //   posById(mission.data.source),
    //   mission.creepNames[0],
    //   getFranchiseDistance(mission.office, mission.data.source),
    //   JSON.stringify(HarvestLedger.get(mission.office, mission.data.source).value),
    //   HarvestLedger.get(mission.office, mission.data.source).perTick,
    //   HarvestLedger.get(mission.office, mission.data.source).age
    // );
    // HarvestLedger.reset(mission.office, mission.data.source);
  }

  static minionLogic(mission: HarvestMission, creep: Creep): void {
    // Set some additional data on the mission
    mission.data.harvestRate ??= creep.body.filter(p => p.type === WORK).length * HARVEST_POWER;
    mission.data.distance ??= getFranchiseDistance(mission.office, mission.data.source);

    // Mission behavior
    // measure energy lost to decay
    const container = getFranchisePlanBySourceId(mission.data.source)?.container.structureId;
    LogisticsLedger.record(
      mission.office,
      'decay',
      -Math.ceil(Math.max(0, franchiseEnergyAvailable(mission.data.source) - (container ? 2000 : 0)) / 1000)
    );

    const franchisePos = posById(mission.data.source);

    if ((franchisePos?.getRangeTo(creep.pos) ?? Infinity) <= 1) {
      const franchise = Memory.rooms[franchisePos!.roomName]?.franchises[mission.office]?.[mission.data.source];
      if (franchise) franchise.lastHarvested = Game.time;
      if (!mission.data.arrived && creep.ticksToLive) {
        mission.data.arrived =
          CREEP_LIFE_TIME -
          creep.ticksToLive + // creep life time
          creep.body.length * CREEP_SPAWN_TIME; // creep spawn time
      }
    }

    if (
      creep.store.getCapacity(RESOURCE_ENERGY) &&
      creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) * 0.5
    ) {
      if (mission.office === franchisePos?.roomName) {
        // Local franchise
        const plan = getFranchisePlanBySourceId(mission.data.source);
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
            HarvestLedger.record(mission.office, mission.data.source, 'deposit', amount);
            LogisticsLedger.record(mission.office, 'deposit', -amount);
            break;
          }
        }
        // Try to build (or repair) container
        // if (result !== OK && !plan.container.structure) {
        //     if (!plan.container.constructionSite) {
        //         plan.container.pos.createConstructionSite(plan.container.structureType);
        //     } else {
        //         result = creep.build(plan.container.constructionSite);
        //     }
        // }
        // if (result !== OK && plan.container.structure && plan.container.structure.hits < plan.container.structure.hitsMax - 500) {
        //     creep.repair(plan.container.structure);
        // }
        // Try to deposit at link
        if (result === ERR_FULL && plan.link.structure) {
          moveTo(creep, plan.link.pos);
          result = creep.transfer(plan.link.structure, RESOURCE_ENERGY);
          if (result === OK) {
            const amount = Math.min(
              creep.store[RESOURCE_ENERGY],
              (plan.link.structure as StructureLink).store.getFreeCapacity(RESOURCE_ENERGY)
            );
            HarvestLedger.record(mission.office, mission.data.source, 'deposit', amount);
            LogisticsLedger.record(mission.office, 'deposit', -amount);
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
        const plan = getFranchisePlanBySourceId(mission.data.source);
        if (plan && Game.rooms[plan.container.pos.roomName] && rcl(mission.office) >= 3) {
          // Try to build or repair container
          if (!plan.container.structure) {
            if (!plan.container.constructionSite) {
              const result = plan.container.pos.createConstructionSite(plan.container.structureType);
              console.log('creating construction site', plan.container.pos, result);
            } else {
              if (creep.build(plan.container.constructionSite) === OK) {
                const amount = -BUILD_POWER * creep.body.filter(p => p.type === WORK).length;
                HarvestLedger.record(mission.office, mission.data.source, 'build', amount);
                LogisticsLedger.record(mission.office, 'deposit', amount);
                return;
              }
            }
          } else if (plan.container.structure.hits < plan.container.structure.hitsMax - 500) {
            if (creep.repair(plan.container.structure) === OK) {
              const amount = -(REPAIR_COST * REPAIR_POWER) * creep.body.filter(p => p.type === WORK).length;
              HarvestLedger.record(mission.office, mission.data.source, 'repair', amount);
              LogisticsLedger.record(mission.office, 'deposit', amount);
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

    const harvested = harvestEnergyFromFranchise(creep, mission.data.source);
    if (harvested || !mission.data.arrived) {
      mission.efficiency.working += 1;
    }
    if (harvested) {
      const amount = Math.min(
        byId(mission.data.source)?.energy ?? 0,
        creep.body.filter(p => p.type === WORK).length * HARVEST_POWER,
        10
      );
      LogisticsLedger.record(mission.office, 'harvest', amount);
    }
  }
}
