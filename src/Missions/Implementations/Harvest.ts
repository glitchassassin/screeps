import { harvestEnergyFromFranchise } from "Behaviors/harvestEnergyFromFranchise";
import { moveTo } from "Behaviors/moveTo";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { scheduleSpawn } from "Minions/spawnQueues";
import { createMission, Mission, MissionStatus, MissionType } from "Missions/Mission";
import { minionCost } from "Selectors/minionCostPerTick";
import { posById } from "Selectors/posById";
import { rcl } from "Selectors/rcl";
import { getFranchisePlanBySourceId } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";

interface HarvestMissionData {
  source: Id<Source>,
}
export type HarvestMission = Mission<MissionType.HARVEST, HarvestMissionData>;

export function createHarvestMission(office: string, source: Id<Source>): HarvestMission {
  // Assume working full time
  const estimate = {
    cpu: CREEP_LIFE_TIME * 0.4,
    energy: minionCost(MinionBuilders[MinionTypes.SALESMAN](spawnEnergyAvailable(office)))
  }
  return createMission({
    office,
    priority: 10,
    type: MissionType.HARVEST,
    data: {
      source,
    },
    estimate,
  })
}

export function spawnHarvestMission(mission: HarvestMission) {
  if (mission.creepNames.length) return; // only need to spawn one minion

  const franchisePlan = getFranchisePlanBySourceId(mission.data.source);
  const franchiseSpawn = franchisePlan?.spawn.structure as StructureSpawn | undefined;
  const franchiseContainer = franchisePlan?.container.pos;

  const name = `HARVEST-${mission.office}-${Game.time % 10000}-${mission.data.source.slice(23)}`

  scheduleSpawn(
    mission.office,
    mission.priority,
    {
      name,
      body: MinionBuilders[MinionTypes.SALESMAN](spawnEnergyAvailable(mission.office)),
    },
    mission.startTime,
    (franchiseSpawn && franchiseContainer) ? {
      spawn: franchiseSpawn.id,
      directions: [franchiseSpawn.pos.getDirectionTo(franchiseContainer.x, franchiseContainer.y)]
    } : undefined
  )

  mission.creepNames.push(name);
}

export function runHarvestMission(mission: HarvestMission) {
  const creep = Game.creeps[mission.creepNames[0]];
  if (!creep) return;

  if (mission.status !== MissionStatus.RUNNING) {
    mission.status = MissionStatus.RUNNING;
    // Record spawning expenses
    mission.actual.cpu += 0.2 // Spawning intent
    mission.actual.energy += minionCost(creep.body.map(p => p.type))
  }

  // Mission behavior
  harvestEnergyFromFranchise(creep, mission.data.source);

  if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) * 0.5) {
    const franchisePos = posById(mission.data.source);
    if (mission.office === franchisePos?.roomName) {
      // Local franchise
      const plan = getFranchisePlanBySourceId(mission.data.source)
      if (!plan) return;

      // Try to deposit at spawn
      let result: ScreepsReturnCode = ERR_FULL
      if (plan.spawn.structure) {
        result = creep.transfer(plan.spawn.structure, RESOURCE_ENERGY)
        if (result === ERR_NOT_IN_RANGE) moveTo(plan.spawn.pos)(creep)
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
        if (result === ERR_NOT_IN_RANGE) moveTo(plan.spawn.pos)(creep)
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
