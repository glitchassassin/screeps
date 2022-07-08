import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { createRefillMission, RefillMission } from "Missions/Implementations/Refill";
import { MissionType } from "Missions/Mission";
import { approximateExtensionsCapacity, roomHasExtensions } from "Selectors/getExtensionsCapacity";
import { hasEnergyIncome } from "Selectors/hasEnergyIncome";
import { minionCost } from "Selectors/minionCostPerTick";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";

/**
 * Maintain a quota of refillers, with pre-spawning
 */
export default {
  byTick: () => {},
  byOffice: (office: string) => {
    // Scale refill down if needed to fit energy
    if (!Memory.offices[office].activeMissions.some(m => m.type === MissionType.REFILL)) {
      Memory.offices[office].pendingMissions
        .filter(m => m.type === MissionType.REFILL)
        .forEach(m => m.estimate.energy = minionCost(MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office))));
    }
    if (
      Memory.offices[office].pendingMissions.some(m => m.type === MissionType.REFILL) ||
      !roomHasExtensions(office) ||
      !hasEnergyIncome(office)
    ) return; // Only one pending mission needed at a time; skip if we have no extensions or very low energy

    // Maintain up to three Accountants (at max level) to refill extensions
    const SCALING_FACTOR = 0.5;
    const capacity = Math.min(32 * 3 * CARRY_CAPACITY, approximateExtensionsCapacity(office) * SCALING_FACTOR);

    const activeMissions = Memory.offices[office].activeMissions.filter(m => m.type === MissionType.REFILL) as RefillMission[]

    const spawnTime = MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office)).length * CREEP_SPAWN_TIME;

    const actualCapacity = activeMissions.reduce((sum, m) => (
      (Game.creeps[m.creepNames[0]]?.ticksToLive ?? CREEP_LIFE_TIME) > spawnTime ? sum + m.data.carryCapacity : sum
    ), 0);

    // console.log('Controllers/Refill.ts', harvestMissionExists, logisticsMissionExists, capacity, actualCapacity, spawnTime);

    if (actualCapacity < capacity) {
      Memory.offices[office].pendingMissions.push(createRefillMission(office));
    }
  }
}
