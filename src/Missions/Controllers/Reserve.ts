import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { createReserveMission, ReserveMission } from "Missions/Implementations/Reserve";
import { MissionStatus, MissionType } from "Missions/Mission";
import { posById } from "Selectors/posById";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    // Make sure we can afford reservers
    if (!MinionBuilders[MinionTypes.LAWYER](Game.rooms[office].energyCapacityAvailable).length) return;

    const reserveMissions = [
      ...Memory.offices[office].pendingMissions.filter(m => m.type === MissionType.RESERVE),
      ...Memory.offices[office].activeMissions.filter(m =>
        m.type === MissionType.RESERVE &&
        (
          !m.data.arrived ||
          m.data.arrived > (Game.creeps[m.creepNames[0]]?.ticksToLive ?? 0)
        )
      )
    ] as ReserveMission[];

    const pendingMissions: ReserveMission[] = [];

    for (const mission of Memory.offices[office].activeMissions) {
      const harvestRoom = posById(mission.data.source)?.roomName ?? '';
      if (
        mission.type !== MissionType.HARVEST ||
        office === harvestRoom ||
        (
          Memory.rooms[harvestRoom]?.reserver === 'LordGreywether' &&
          (Memory.rooms[harvestRoom]?.reservation ?? 0) > 3000
        ) ||
        pendingMissions.some(m => m.data.reserveTarget === harvestRoom)
      ) continue;

      // remote harvest missions only
      const reserveMission = reserveMissions
        .find(m => m.data.reserveTarget === harvestRoom) ??
        createReserveMission(office, harvestRoom, mission.priority);

      if (reserveMission.status === MissionStatus.PENDING) pendingMissions.push(reserveMission);
    }

    // Keep only pendingMissions
    Memory.offices[office].pendingMissions = Memory.offices[office].pendingMissions
      .filter(m => m.type !== MissionType.RESERVE)
      .concat(pendingMissions);
  }
}
