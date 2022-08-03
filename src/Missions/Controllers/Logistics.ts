import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { createLogisticsMission } from 'Missions/Implementations/Logistics';
import { MissionType } from 'Missions/Mission';
import { activeMissions, isMission, not, pendingMissions } from 'Missions/Selectors';
import { franchiseEnergyAvailable } from 'Selectors/franchiseEnergyAvailable';
import { minionCost } from 'Selectors/minionCostPerTick';
import { posById } from 'Selectors/posById';
import { getFranchisePlanBySourceId } from 'Selectors/roomPlans';
import { spawnEnergyAvailable } from 'Selectors/spawnEnergyAvailable';

const REMOTE_LOGISTICS_PRIORITY = 11;
const INROOM_LOGISTICS_PRIORITY = 11.1;

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    // Scale down if needed to fit energy
    if (!activeMissions(office).some(isMission(MissionType.LOGISTICS))) {
      Memory.offices[office].pendingMissions
        .filter(isMission(MissionType.LOGISTICS))
        .forEach(
          m => (m.estimate.energy = minionCost(MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office))))
        );
    }
    const inRoomLogisticsMissions = [];
    const remoteLogisticsMissions = [];
    for (const mission of pendingMissions(office).filter(isMission(MissionType.LOGISTICS))) {
      if (mission.priority === REMOTE_LOGISTICS_PRIORITY) remoteLogisticsMissions.push(mission);
      if (mission.priority === INROOM_LOGISTICS_PRIORITY) inRoomLogisticsMissions.push(mission);
    }

    let inRoomCapacity = 0;
    let remoteCapacity = 0;
    let actualCapacity = 0;
    for (const mission of activeMissions(office)) {
      if (isMission(MissionType.LOGISTICS)(mission)) {
        actualCapacity += mission.data.capacity ?? 0;
      }
      if (isMission(MissionType.HARVEST)(mission)) {
        if (!mission.data.distance || !mission.data.harvestRate) continue;
        const room = posById(mission.data.source)?.roomName;
        const remote = mission.office !== room;
        const reserved = Game.rooms[room ?? '']?.controller?.reservation?.username === 'LordGreywether';
        const canReserve = MinionBuilders[MinionTypes.MARKETER](Game.rooms[office].energyCapacityAvailable).length > 0;
        const harvestRate =
          !remote || canReserve
            ? SOURCE_ENERGY_CAPACITY / ENERGY_REGEN_TIME
            : SOURCE_ENERGY_NEUTRAL_CAPACITY / ENERGY_REGEN_TIME;
        const capacity = mission.data.distance * 2 * Math.min(harvestRate, mission.data.harvestRate);
        // console.log(room, remote, canReserve, reserved, harvestRate, mission.data.harvestRate);
        if (remote) {
          remoteCapacity += capacity;
        } else if (
          !getFranchisePlanBySourceId(mission.data.source)?.link.structure ||
          franchiseEnergyAvailable(mission.data.source) > CONTAINER_CAPACITY
        ) {
          // If we don't have a link, or if energy is piling up behind the link for some
          // reason, dispatch logistics
          inRoomCapacity += capacity;
        }
      }
    }

    // If we have some logistics minions, wait to spawn another
    // until demand is at least half the capacity of a hauler
    const carrierCapacity = (spawnEnergyAvailable(office) / 2 / BODYPART_COST[CARRY]) * CARRY_CAPACITY;
    if (actualCapacity) actualCapacity += carrierCapacity / 2;

    const inRoomPendingMissions = [];
    const remotePendingMissions = [];

    let inRoomMissionCapacity = actualCapacity;
    while (inRoomMissionCapacity < inRoomCapacity) {
      const mission = inRoomLogisticsMissions.shift() ?? createLogisticsMission(office, INROOM_LOGISTICS_PRIORITY);
      inRoomPendingMissions.push(mission);
      inRoomMissionCapacity += mission.data.capacity;
    }

    let remoteMissionCapacity = inRoomMissionCapacity;
    while (remoteMissionCapacity < remoteCapacity) {
      const mission = remoteLogisticsMissions.shift() ?? createLogisticsMission(office, REMOTE_LOGISTICS_PRIORITY);
      remotePendingMissions.push(mission);
      remoteMissionCapacity += mission.data.capacity;
    }
    Memory.offices[office].pendingMissions = [
      ...pendingMissions(office).filter(not(isMission(MissionType.LOGISTICS))),
      ...inRoomPendingMissions,
      ...remotePendingMissions
    ];
  }
};
