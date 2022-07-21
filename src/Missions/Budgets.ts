import { rampartsToRepair } from "Selectors/Combat/defenseRamparts";
import { roomPlans } from "Selectors/roomPlans";
import { Mission, MissionType } from "./Mission";

export function getWithdrawLimit(mission: Mission<MissionType>) {
  return getBudgetAdjustment(mission).energy;
}

/**
 * Sets capacity threshold for different mission types, to make sure certain
 * missions can spawn only when storage levels are high enough
 */
export function getBudgetAdjustment(mission: Mission<MissionType>) {
  if (!roomPlans(mission.office)?.headquarters?.storage.structure) {
    // No storage yet - minimal capacities enforced, except for income missions
    if (
      mission.type === MissionType.HARVEST ||
      mission.type === MissionType.LOGISTICS ||
      mission.type === MissionType.REFILL
    ) {
      return {
        cpu: 2000,
        energy: -mission.estimate.energy,
      }
    } else if (
      mission.type === MissionType.EXPLORE ||
      mission.type === MissionType.RESERVE ||
      mission.type === MissionType.DEFEND_REMOTE ||
      mission.type === MissionType.DEFEND_OFFICE
    ) {
      return {
        cpu: 2000,
        energy: 0,
      }
    } else {
      return {
        cpu: 2000,
        energy: 500,
      }
    }
  } else {
    // Storage allows more fine-grained capacity management
    if (
      mission.type === MissionType.HARVEST ||
      mission.type === MissionType.LOGISTICS ||
      mission.type === MissionType.REFILL
    ) {
      return {
        cpu: 2000,
        energy: 0,
      }
    } else if (
      [
        MissionType.RESERVE,
        MissionType.DEFEND_REMOTE,
        MissionType.HQ_LOGISTICS,
        MissionType.DEFEND_OFFICE
      ].includes(mission.type) ||
      (mission.type === MissionType.ENGINEER && rampartsToRepair(mission.office).length)
    ) {
      return {
        cpu: 2000,
        energy: 1500,
      }
    } else if (mission.type === MissionType.UPGRADE && !mission.data.emergency) {
      return {
        cpu: 2000,
        energy: 55000,
      }
    } else {
      return {
        cpu: 2000,
        energy: 40000,
      }
    }
  }
}
