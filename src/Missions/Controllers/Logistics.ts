import { createLogisticsMission } from "Missions/Implementations/Logistics";
import { MissionType } from "Missions/Mission";
import { posById } from "Selectors/posById";
import { getFranchisePlanBySourceId } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    const inRoomLogisticsMissions = [];
    const remoteLogisticsMissions = [];
    for (const mission of Memory.offices[office].pendingMissions) {
      if (mission.type !== MissionType.LOGISTICS) continue;
      if (mission.priority === 2) remoteLogisticsMissions.push(mission);
      if (mission.priority === 11) inRoomLogisticsMissions.push(mission);
    }

    let inRoomCapacity = 0;
    let remoteCapacity = 0;
    let actualCapacity = 0;
    for (const mission of Memory.offices[office].activeMissions) {
      if (mission.type === MissionType.LOGISTICS) {
        actualCapacity += mission.data.capacity ?? 0;
      }
      if (mission.type === MissionType.HARVEST) {
        if (!mission.data.distance || !mission.data.harvestRate) continue;
        const remote = mission.office !== posById(mission.data.source)?.roomName;
        const capacity = mission.data.distance * 2 * Math.min(10, mission.data.harvestRate);
        if (remote) {
          remoteCapacity += capacity;
        } else if (!getFranchisePlanBySourceId(mission.data.source)?.link.structure) {
          inRoomCapacity += capacity;
        }
      }
    }

    // If we have some logistics minions, wait to spawn another
    // until demand is at least half the capacity of a hauler
    const carrierCapacity = ((spawnEnergyAvailable(office) / 2) / BODYPART_COST[CARRY]) * CARRY_CAPACITY;
    if (actualCapacity) actualCapacity += carrierCapacity / 2;

    const inRoomPendingMissions = [];
    const remotePendingMissions = [];

    let inRoomMissionCapacity = actualCapacity;
    while (inRoomMissionCapacity < inRoomCapacity) {
      const mission = inRoomLogisticsMissions.shift() ?? createLogisticsMission(office);
      inRoomPendingMissions.push(mission);
      inRoomMissionCapacity += mission.data.capacity;
    }

    let remoteMissionCapacity = inRoomMissionCapacity;
    while (remoteMissionCapacity < remoteCapacity) {
      const mission = remoteLogisticsMissions.shift() ?? createLogisticsMission(office, 2);
      remotePendingMissions.push(mission);
      remoteMissionCapacity += mission.data.capacity;
    }
    Memory.offices[office].pendingMissions = [
      ...Memory.offices[office].pendingMissions.filter(m => m.type !== MissionType.LOGISTICS),
      ...inRoomPendingMissions,
      ...remotePendingMissions
    ]
  }
}
