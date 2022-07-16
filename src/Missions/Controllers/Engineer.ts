import { createEngineerMission } from "Missions/Implementations/Engineer";
import { MissionStatus, MissionType } from "Missions/Mission";
import { isMission, isStatus, not, pendingAndActiveMissions, pendingMissions, submitMission } from "Missions/Selectors";
import { facilitiesCostPending } from "Selectors/facilitiesWorkToDo";
import { hasEnergyIncome } from "Selectors/hasEnergyIncome";
import { rcl } from "Selectors/rcl";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    const queuedMissions = pendingAndActiveMissions(office).filter(isMission(MissionType.ENGINEER));

    if (queuedMissions.some(isStatus(MissionStatus.RUNNING))) return; // Only one pending Engineer mission at a time

    // Calculate effective work for active missions
    const workPending = queuedMissions.reduce((sum, m) => sum + (m.data.workParts * CREEP_LIFE_TIME), 0);
    let pendingCost = facilitiesCostPending(office);

    // If rcl < 2, engineers will also upgrade
    if (rcl(office) < 2) {
      const controller = Game.rooms[office].controller;
      pendingCost += (controller?.progressTotal ?? 0) - (controller?.progress ?? 0);
    }

    if (pendingCost === 0) {
      // Clear pending Engineer missions
      Memory.offices[office].pendingMissions = pendingMissions(office).filter(not(isMission(MissionType.ENGINEER)));
    }

    // console.log('queuedMissions', queuedMissions.length, 'workPending', workPending, 'pendingCost', pendingCost);

    if (hasEnergyIncome(office) && pendingCost > workPending) {
      submitMission(office, createEngineerMission(office));
    }
  }
}
