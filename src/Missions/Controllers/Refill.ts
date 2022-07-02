import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { createRefillMission, RefillMission } from "Missions/Implementations/Refill";
import { MissionStatus, MissionType } from "Missions/Mission";
import { approximateExtensionsCapacity, roomHasExtensions } from "Selectors/getExtensionsCapacity";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";

/**
 * Maintain a quota of refillers, with pre-spawning
 */
export default {
  byTick: () => {},
  byOffice: (office: string) => {
    if (
      Memory.offices[office].pendingMissions.some(m => m.type === MissionType.REFILL) ||
      !roomHasExtensions(office)
    ) return; // Only one pending mission needed at a time

    // Maintain up to three Accountants (at max level) to refill extensions
    const SCALING_FACTOR = 0.8;
    const capacity = Math.min(32 * 3 * CARRY_CAPACITY, approximateExtensionsCapacity(office) * SCALING_FACTOR);

    const activeMissions = Memory.offices[office].activeMissions.filter(m => m.type === MissionType.REFILL) as RefillMission[]

    const spawnTime = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office)).length * CREEP_SPAWN_TIME;

    const actualCapacity = activeMissions.reduce((sum, m) => (
      (Game.creeps[m.creepNames[0]]?.ticksToLive ?? CREEP_LIFE_TIME) > spawnTime ? sum + m.data.carryCapacity : sum
    ), 0);

    const harvestMissionExists = Memory.offices[office].activeMissions.some(m => m.type === MissionType.HARVEST && m.status === MissionStatus.RUNNING);
    const logisticsMissionExists = Memory.offices[office].activeMissions.some(m => m.type === MissionType.LOGISTICS && m.status === MissionStatus.RUNNING);

    // console.log('Controllers/Refill.ts', harvestMissionExists, logisticsMissionExists, capacity, actualCapacity, spawnTime);

    if (harvestMissionExists && logisticsMissionExists && actualCapacity < capacity) {
      Memory.offices[office].pendingMissions.push(createRefillMission(office));
    }
  }
}
