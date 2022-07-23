import { createHQLogisticsMission } from "Missions/Implementations/HQLogistics";
import { createTowerLogisticsMission } from "Missions/Implementations/TowerLogistics";
import { MissionStatus, MissionType } from "Missions/Mission";
import { activeMissions, and, isMission, isStatus, not, pendingAndActiveMissions, submitMission } from "Missions/Selectors";
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
    if (
      towersNeedRefilled &&
      storageEnergyAvailable(office) > SPAWN_ENERGY_CAPACITY &&
      !pendingAndActiveMissions(office).some(isMission(MissionType.TOWER_LOGISTICS))
    ) {
      submitMission(office, createTowerLogisticsMission(office));
    }

    if (!roomPlans(office)?.headquarters?.link.structure) return; // not worth it maintaining just for storage + spawn
    // Maintain one HQ Logistics minion
    const scheduledMissions = pendingAndActiveMissions(office).some(and(
      isMission(MissionType.HQ_LOGISTICS),
      not(isStatus(MissionStatus.RUNNING))
    ));
    if (!scheduledMissions) {
      const activeMission = activeMissions(office).find(isMission(MissionType.HQ_LOGISTICS));
      if (!activeMission) {
        // start immediately
        submitMission(office, createHQLogisticsMission(office));
      } else if (Game.creeps[activeMission.creepNames[0]]?.ticksToLive) {
        const startTime = Game.time + Game.creeps[activeMission.creepNames[0]]!.ticksToLive!;
        submitMission(office, createHQLogisticsMission(office, startTime));
      }
    }
  }
}
