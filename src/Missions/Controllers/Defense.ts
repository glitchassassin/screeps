import { MinionTypes } from "Minions/minionTypes";
import { createDefendOfficeMission } from "Missions/Implementations/DefendOffice";
import { createDefendRemoteMission } from "Missions/Implementations/DefendRemote";
import { MissionType } from "Missions/Mission";
import { activeMissions, assignedCreep, isMission, pendingAndActiveMissions, pendingMissions, submitMission } from "Missions/Selectors";
import { ThreatLevel } from "Selectors/Combat/threatAnalysis";
import { creepStats } from "Selectors/creepStats";
import { findHostileCreeps } from "Selectors/findHostileCreeps";
import { getTerritoriesByOffice } from "Selectors/getTerritoriesByOffice";
import { isCreep } from "Selectors/typeguards";

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    if (!pendingAndActiveMissions(office).some(isMission(MissionType.DEFEND_REMOTE))) {
      for (const t of getTerritoriesByOffice(office)) {
        const [threatLevel, hostileScore] = Memory.rooms[t].threatLevel ?? [ThreatLevel.UNKNOWN, 0];
        if (Memory.rooms[t].invaderCore) {
          // Hostile minions or invader core detected
          submitMission(office, createDefendRemoteMission(office, true));
          break;
        } else if (hostileScore > 0) {
          // If hostileScore is too great, will be removed from Territories
          submitMission(office, createDefendRemoteMission(office));
        }
      }
    }

    if (!pendingMissions(office).find(isMission(MissionType.DEFEND_OFFICE))) {
      const hostiles = creepStats(findHostileCreeps(office));
      const allies = creepStats(activeMissions(office).filter(isMission(MissionType.DEFEND_OFFICE)).map(assignedCreep).filter(isCreep));
      if (hostiles.count) {
        // Hostiles in room; calculate defenders needed
        if (Math.max(hostiles.attack, hostiles.rangedAttack) > allies.attack) {
           submitMission(office, createDefendOfficeMission(office, MinionTypes.GUARD));
           submitMission(office, createDefendOfficeMission(office, MinionTypes.MEDIC));
        }
      }
    }
  }
}
