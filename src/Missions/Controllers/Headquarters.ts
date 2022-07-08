import { createHQLogisticsMission } from "Missions/Implementations/HQLogistics";
import { createTowerLogisticsMission } from "Missions/Implementations/TowerLogistics";
import { MissionStatus, MissionType } from "Missions/Mission";
import { rcl } from "Selectors/rcl";
import { roomPlans } from "Selectors/roomPlans";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    if (rcl(office) < 3) return;
    // Maintain Tower Logistics minion, as needed
    const hq = roomPlans(office)?.headquarters;
    const towersNeedRefilled = hq?.towers.some(t => ((t.structure as StructureTower)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > CARRY_CAPACITY * 3);
    if (towersNeedRefilled && storageEnergyAvailable(office) > SPAWN_ENERGY_CAPACITY && ![
      ...Memory.offices[office].pendingMissions,
      ...Memory.offices[office].activeMissions
    ].some(m => m.type === MissionType.TOWER_LOGISTICS)) {
      Memory.offices[office].pendingMissions.push(createTowerLogisticsMission(office));
    }

    if (rcl(office) < 4) return;
    // Maintain one HQ Logistics minion
    const scheduledMissions = [
      ...Memory.offices[office].pendingMissions,
      ...Memory.offices[office].activeMissions,
    ].some(m => m.type === MissionType.HQ_LOGISTICS && m.status !== MissionStatus.RUNNING)
    if (!scheduledMissions) {
      const activeMission = Memory.offices[office].activeMissions.find(m => m.type === MissionType.HQ_LOGISTICS);
      if (!activeMission) {
        // start immediately
        Memory.offices[office].pendingMissions.push(createHQLogisticsMission(office));
      } else if (Game.creeps[activeMission.creepNames[0]]?.ticksToLive) {
        const startTime = Game.time + Game.creeps[activeMission.creepNames[0]]!.ticksToLive!;
        Memory.offices[office].pendingMissions.push(createHQLogisticsMission(office, startTime));
      }
    }
  }
}
