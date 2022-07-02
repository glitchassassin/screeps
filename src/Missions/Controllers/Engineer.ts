import { createEngineerMission, EngineerMission } from "Missions/Implementations/Engineer";
import { HarvestMission } from "Missions/Implementations/Harvest";
import { LogisticsMission } from "Missions/Implementations/Logistics";
import { MissionStatus, MissionType } from "Missions/Mission";
import { facilitiesCostPending } from "Selectors/facilitiesWorkToDo";
import { rcl } from "Selectors/rcl";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    const queuedMissions = [
      ...Memory.offices[office].pendingMissions.filter(m => m.type === MissionType.ENGINEER),
      ...Memory.offices[office].activeMissions.filter(m => m.type === MissionType.ENGINEER)
    ] as EngineerMission[];

    if (queuedMissions.some(m => m.status !== MissionStatus.RUNNING)) return; // Only one pending Engineer mission at a time

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
      Memory.offices[office].pendingMissions = Memory.offices[office].pendingMissions.filter(m => m.type !== MissionType.ENGINEER);
    }

    // console.log('queuedMissions', queuedMissions.length, 'workPending', workPending, 'pendingCost', pendingCost);

    const harvestMissions = Memory.offices[office].activeMissions.filter(m => m.type === MissionType.HARVEST && m.status === MissionStatus.RUNNING) as HarvestMission[];
    const logisticsMissions = Memory.offices[office].activeMissions.filter(m => m.type === MissionType.LOGISTICS && m.status === MissionStatus.RUNNING) as LogisticsMission[];

    if (harvestMissions.length && logisticsMissions.length && pendingCost > workPending) {
      Memory.offices[office].pendingMissions.push(createEngineerMission(office));
    }
  }
}
