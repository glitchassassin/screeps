import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { createMission, Mission, MissionType } from "Missions/Mission";
import { minionCost } from "Selectors/minionCostPerTick";
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
