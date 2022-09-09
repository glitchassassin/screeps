import { roomPlans } from 'Selectors/roomPlans';
import { Mission, MissionType } from './Mission';

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
      mission.type === MissionType.RESERVE ||
      mission.type === MissionType.REFILL
    ) {
      return {
        cpu: 2000,
        energy: -Infinity
      };
    } else {
      return {
        cpu: 2000,
        energy: 0
      };
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
        energy: -Infinity
      };
    } else if (
      [MissionType.RESERVE, MissionType.DEFEND_REMOTE, MissionType.HQ_LOGISTICS, MissionType.DEFEND_OFFICE].includes(
        mission.type
      )
    ) {
      return {
        cpu: 2000,
        energy: Game.rooms[mission.office].energyCapacityAvailable ?? 1500
      };
    } else if (mission.type === MissionType.UPGRADE && !mission.data.emergency) {
      return {
        cpu: 2000,
        energy: 100000
      };
    } else {
      return {
        cpu: 2000,
        energy: 60000
      };
    }
  }
}
