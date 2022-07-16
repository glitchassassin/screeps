import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { createReserveMission, ReserveMission } from "Missions/Implementations/Reserve";
import { MissionStatus, MissionType } from "Missions/Mission";
import { activeMissions, assignedCreep, isMission, isStatus, not, pendingMissions } from "Missions/Selectors";
import { posById } from "Selectors/posById";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    // Make sure we can afford reservers
    if (!MinionBuilders[MinionTypes.MARKETER](spawnEnergyAvailable(office)).length) return;

    const reserveMissions = [
      ...pendingMissions(office).filter(isMission(MissionType.RESERVE)),
      ...activeMissions(office).filter(m =>
        isMission(MissionType.RESERVE)(m) &&
        (
          !m.data.arrived ||
          m.data.arrived > (assignedCreep(m)?.ticksToLive ?? 0)
        )
      )
    ] as ReserveMission[];

    const pending: ReserveMission[] = [];

    for (const mission of activeMissions(office)) {
      const harvestRoom = posById(mission.data.source)?.roomName ?? '';
      if (
        mission.type !== MissionType.HARVEST ||
        office === harvestRoom ||
        (
          Memory.rooms[harvestRoom]?.reserver === 'LordGreywether' &&
          (Memory.rooms[harvestRoom]?.reservation ?? 0) > 3000
        ) ||
        pending.some(m => m.data.reserveTarget === harvestRoom)
      ) continue;

      // remote harvest missions only
      const reserveMission = reserveMissions
        .find(m => m.data.reserveTarget === harvestRoom) ??
        createReserveMission(office, harvestRoom, mission.priority);

      if (isStatus(MissionStatus.PENDING)(reserveMission)) pending.push(reserveMission);
    }

    // Keep only pendingMissions
    Memory.offices[office].pendingMissions = pendingMissions(office)
      .filter(not(isMission(MissionType.RESERVE)))
      .concat(pending);
  }
}
