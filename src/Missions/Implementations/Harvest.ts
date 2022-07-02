import { harvestEnergyFromFranchise } from "Behaviors/harvestEnergyFromFranchise";
import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { getFranchiseDistance } from "Selectors/getFranchiseDistance";
import { getClosestByRange } from "Selectors/MapCoordinates";
import { minionCost } from "Selectors/minionCostPerTick";
import { posById } from "Selectors/posById";
import { rcl } from "Selectors/rcl";
import { getFranchisePlanBySourceId, getSpawns, roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import { MissionImplementation } from "./MissionImplementation";

export interface HarvestMission extends Mission<MissionType.HARVEST> {
  data: {
    source: Id<Source>,
    arrived?: number,
    distance?: number,
    harvestRate: number
  }
}

export function createHarvestMission(office: string, source: Id<Source>, startTime?: number): HarvestMission {
  const body = MinionBuilders[MinionTypes.SALESMAN](spawnEnergyAvailable(office))
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(body),
  }

  // Make sure that if room plans aren't finished we still prioritize the closest source
  const franchise1 = roomPlans(office)?.franchise1?.sourceId ?? getSpawns(office)[0]?.pos.findClosestByRange(FIND_SOURCES)?.id;

  // set priority differently for remote sources
  const remote = (office !== posById(source)?.roomName);
  const distance = getFranchiseDistance(office, source);
  let priority = 10;
  if (remote) {
    priority = 5;
    if (distance) {
      // Increase priority for closer franchises, up to 1 point for closer than 50 squares
      // Round priority to two places
      priority += Math.round(100 * (Math.min(50, distance) / distance)) / 100;
    }
  }  else {
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
    estimate,
  })
}

export class Harvest extends MissionImplementation {
  static spawn(mission: HarvestMission) {
    if (mission.creepNames.length) return; // only need to spawn one minion

    // Calculate harvester spawn preference
    const franchisePlan = getFranchisePlanBySourceId(mission.data.source);
    const franchiseContainer = franchisePlan?.container.pos;
    const spawn = franchiseContainer ? getClosestByRange(franchiseContainer, getSpawns(mission.office)) : getSpawns(mission.office)[0];

    const spawnPreference = spawn ? {
      spawn: spawn.id
    } : undefined;

    // Set name
    const name = `HARVEST-${mission.office}-${Game.time % 10000}-${mission.data.source.slice(mission.data.source.length - 1)}`
    const body = MinionBuilders[MinionTypes.SALESMAN](spawnEnergyAvailable(mission.office));

    scheduleSpawn(
      mission.office,
      mission.priority,
      {
        name,
        body,
      },
      spawnPreference ? mission.startTime : undefined,
      spawnPreference
    )

    mission.creepNames.push(name);
  }

  static minionLogic(mission: Mission<MissionType>, creep: Creep): void {
    // Set some additional data on the mission
    mission.data.harvestRate ??= creep.body.filter(p => p.type === WORK).length * HARVEST_POWER;
    mission.data.distance ??= getFranchiseDistance(mission.office, mission.data.source);

    // Mission behavior
    harvestEnergyFromFranchise(creep, mission.data.source);

    const franchisePos = posById(mission.data.source);
    if (
      !mission.data.arrived &&
      creep.ticksToLive &&
      (franchisePos?.getRangeTo(creep.pos) ?? Infinity) <= 1
    ) {
      mission.data.arrived =
        (CREEP_LIFE_TIME - creep.ticksToLive) + // creep life time
        (creep.body.length * CREEP_SPAWN_TIME); // creep spawn time
    }

    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) * 0.5) {

      if (mission.office === franchisePos?.roomName) {
        // Local franchise
        const plan = getFranchisePlanBySourceId(mission.data.source)
        if (!plan) return;

        // Try to deposit at spawn
        let result: ScreepsReturnCode = ERR_FULL
        if (plan.spawn.structure) {
          result = creep.transfer(plan.spawn.structure, RESOURCE_ENERGY)
          if (result === ERR_NOT_IN_RANGE) moveTo(creep, plan.spawn.pos)
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
          result = creep.transfer(plan.link.structure, RESOURCE_ENERGY)
          if (result === ERR_NOT_IN_RANGE) moveTo(creep, plan.spawn.pos)
        }

        if (result === ERR_FULL) {
          creep.drop(RESOURCE_ENERGY)
        }
      } else {
        // Remote franchise
        const plan = getFranchisePlanBySourceId(mission.data.source)
        if (!plan || !Game.rooms[plan.container.pos.roomName] || rcl(mission.office) < 3) return;

        // Try to build or repair container
        if (!plan.container.structure) {
          if (!plan.container.constructionSite) {
            plan.container.pos.createConstructionSite(plan.container.structureType);
          } else {
            if (creep.build(plan.container.constructionSite) === OK) {
              mission.actual.energy += BUILD_POWER * creep.body.filter(p => p.type === WORK).length;
            }
          }
        } else if (plan.container.structure.hits < plan.container.structure.hitsMax - 500) {
          if (creep.repair(plan.container.structure) === OK) {
            mission.actual.energy += (REPAIR_COST * REPAIR_POWER) * creep.body.filter(p => p.type === WORK).length;
          }
        }
      }
    }
  }
}
