import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { SpawnOrder } from 'Minions/spawnQueues';
import { createLogisticsOrder } from 'Missions/Implementations/Logistics';
import { createMobileRefillOrder } from 'Missions/Implementations/MobileRefill';
import { MissionType } from 'Missions/Mission';
import { activeMissions, assignedCreep, isMission } from 'Missions/Selectors';
import { byId } from 'Selectors/byId';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { posById } from 'Selectors/posById';
import { getFranchisePlanBySourceId, roomPlans } from 'Selectors/roomPlans';
import { upgradersNeedSupplementalEnergy } from 'Selectors/upgradersNeedSupplementalEnergy';

const REMOTE_LOGISTICS_PRIORITY = 11;
const INROOM_LOGISTICS_PRIORITY = 11.1;

export default {
  byTick: () => {},
  byOffice: (office: string): SpawnOrder[] => {
    const orders: SpawnOrder[] = [];
    // Maintain one mobile refill mission
    const mobileRefillMissions = upgradersNeedSupplementalEnergy(office) ? 2 : 1;
    if (
      roomPlans(office)?.headquarters?.storage.structure &&
      activeMissions(office).filter(isMission(MissionType.MOBILE_REFILL)).length < mobileRefillMissions
    ) {
      orders.push(createMobileRefillOrder(office, INROOM_LOGISTICS_PRIORITY));
    }

    let inRoomCapacity = 0;
    let remoteCapacity = 0;
    let actualCapacity = 0;
    for (const mission of activeMissions(office)) {
      if (isMission(MissionType.LOGISTICS)(mission)) {
        const ttl = assignedCreep(mission)?.ticksToLive;
        if (ttl && ttl < 200) continue; // creep is close to dying, don't count its capacity towards total
        actualCapacity += mission.data.capacity ?? 0;
      }
      if (isMission(MissionType.HARVEST)(mission)) {
        if (!mission.data.distance || !mission.data.harvestRate || !mission.data.arrived) continue;
        const room = posById(mission.data.source)?.roomName;
        const remote = mission.office !== room;
        const reserved = Game.rooms[room ?? '']?.controller?.reservation?.username === 'LordGreywether';
        const canReserve = MinionBuilders[MinionTypes.MARKETER](Game.rooms[office].energyCapacityAvailable).length > 0;
        const time = Math.min(mission.data.distance * 2, assignedCreep(mission)?.ticksToLive ?? CREEP_LIFE_TIME);
        const harvestRate =
          (byId(mission.data.source)?.energyCapacity ?? SOURCE_ENERGY_NEUTRAL_CAPACITY) / ENERGY_REGEN_TIME;
        const capacity = time * Math.min(harvestRate, mission.data.harvestRate);
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
    // const carrierCapacity = (spawnEnergyAvailable(office) / 2 / BODYPART_COST[CARRY]) * CARRY_CAPACITY;
    // if (actualCapacity) actualCapacity += carrierCapacity / 2;

    // actualCapacity *= 0.5; // allow for inefficiencies

    let inRoomMissionCapacity = actualCapacity;
    while (inRoomMissionCapacity < inRoomCapacity) {
      const order = createLogisticsOrder(office, INROOM_LOGISTICS_PRIORITY);
      orders.push(order);
      inRoomMissionCapacity += order.mission.data.capacity;
    }

    let remoteMissionCapacity = inRoomMissionCapacity;
    while (remoteMissionCapacity < remoteCapacity) {
      const order = createLogisticsOrder(office, REMOTE_LOGISTICS_PRIORITY);
      orders.push(order);
      remoteMissionCapacity += order.mission.data.capacity;
    }

    return orders;
  }
};
