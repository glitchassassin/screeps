import { createDefendRemoteMission } from "Missions/Implementations/DefendRemote";
import { MissionType } from "Missions/Mission";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    for (const t of Memory.offices[office].territories ?? []) {
      if (Memory.rooms[t].invaderCore || Memory.rooms[t].lastHostileSeen === Memory.rooms[t].scanned) {
        // Hostile minions or invader core detected
        if (![
          ...Memory.offices[office].pendingMissions,
          ...Memory.offices[office].activeMissions
        ].some(m => m.type === MissionType.DEFEND_REMOTE)) {
          const mission = createDefendRemoteMission(office);
          Memory.offices[office].pendingMissions.push(mission);
        }
      }
    }
  }
}
