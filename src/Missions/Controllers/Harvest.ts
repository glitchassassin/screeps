import { MinionBuilders, MinionTypes } from 'Minions/minionTypes';
import { SpawnOrder } from 'Minions/spawnQueues';
import { createHarvestOrder, HarvestMission } from 'Missions/Implementations/Harvest';
import { createReserveOrder } from 'Missions/Implementations/Reserve';
import { MissionStatus, MissionType } from 'Missions/Mission';
import { activeMissions, and, isMission, isStatus, missionExpired, not } from 'Missions/Selectors';
import { byId } from 'Selectors/byId';
import { franchisesByOffice } from 'Selectors/Franchises/franchisesByOffice';
import { adjacentWalkablePositions } from 'Selectors/Map/MapCoordinates';
import { posById } from 'Selectors/posById';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';
// import { logCpu, logCpuStart } from 'utils/logCPU';

// TODO - We need to track replacement missions more atomically.
// We can give missions a unique ID, which can feed the creep name as well.
// Then we can track the replacement as part of the mission data so it doesn't get replaced twice.

export default {
  name: 'Harvest',
  byTick: () => {},
  byOffice: (office: string): SpawnOrder[] => {
    const orders: SpawnOrder[] = [];
    // If storage is at least half full, don't worry about spawning more harvesters
    if (storageEnergyAvailable(office) > STORAGE_CAPACITY / 2) return orders;
    // logCpuStart();
    const franchises = franchisesByOffice(office);
    // logCpu('get franchises');

    const shouldReserve = MinionBuilders[MinionTypes.MARKETER](Game.rooms[office].energyCapacityAvailable).length > 0;

    const roomsToReserve = new Set<string>();
    const activeMissionsBySource = activeMissions(office).reduce((missions, mission) => {
      if (isMission(MissionType.HARVEST)(mission) && !missionExpired(mission)) {
        roomsToReserve.add(posById(mission.data.source)?.roomName ?? '');
        missions[mission.data.source] ??= [];
        missions[mission.data.source].push(mission);
      }
      return missions;
    }, {} as Record<Id<Source>, HarvestMission[]>);
    // logCpu('sort franchise missions');

    const workPartsPerHarvester = MinionBuilders[MinionTypes.SALESMAN](
      Game.rooms[office].energyCapacityAvailable
    ).filter(p => p === WORK).length;

    const reserveCount = shouldReserve
      ? [...roomsToReserve].filter(
          room =>
            room !== office &&
            !(Memory.rooms[room].reserver === 'LordGreywether' && (Memory.rooms[room].reservation ?? 0) >= 3000)
        ).length
      : 0;

    const reserveMissions = activeMissions(office).filter(
      and(isMission(MissionType.RESERVE), not(and(missionExpired, isStatus(MissionStatus.RUNNING))))
    );
    if (reserveCount > reserveMissions.length) {
      for (let i = reserveMissions.length; i < reserveCount; i++) {
        orders.push(createReserveOrder(office));
      }
    }
    // logCpu('create reserve order');

    const maxWorkParts = Math.min(
      5,
      Math.floor((Game.rooms[office].energyCapacityAvailable - BODYPART_COST[MOVE]) / BODYPART_COST[WORK])
    );

    // Create new harvest mission for source, if it doesn't exist
    for (const { source, remote } of franchises) {
      const sourcePos = posById(source);
      if (!sourcePos) continue;

      if (
        Memory.rooms[sourcePos.roomName]?.reserver &&
        Memory.rooms[sourcePos.roomName]?.reserver !== 'LordGreywether'
      ) {
        // room is reserved by hostile, ignore
        continue;
      }
      const maxMissions = adjacentWalkablePositions(sourcePos, true).length;
      const activeMissions = activeMissionsBySource[source] ?? [];

      // recalculate pending missions estimate, if needed
      const maxHarvestPower = Math.min(
        workPartsPerHarvester * maxMissions * HARVEST_POWER,
        (byId(source)?.energyCapacity ?? SOURCE_ENERGY_NEUTRAL_CAPACITY) / ENERGY_REGEN_TIME
      );
      let actualHarvestPower = activeMissions.reduce((sum, m) => sum + m.data.harvestRate, 0);
      // logCpu('analyzing existing missions');

      if (maxMissions > activeMissions.length && maxHarvestPower > actualHarvestPower) {
        orders.push(createHarvestOrder(office, source));
      }
      // logCpu('create harvest order');
    }
    return orders;
  }
};
