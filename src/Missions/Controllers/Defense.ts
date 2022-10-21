import { SpawnOrder } from 'Minions/spawnQueues';
import { createDefendRemoteOrder } from 'Missions/Implementations/DefendRemote';
import { MissionType } from 'Missions/Mission';
import { activeMissions, activeSquadMissions, assignedCreep, isMission, isSquadMission } from 'Missions/Selectors';
import { SquadMissionType } from 'Missions/Squads';
import { createAttackerHealerDuoMission } from 'Missions/Squads/Implementations/AttackerHealerDuo';
import { ThreatLevel } from 'Selectors/Combat/threatAnalysis';
import { creepStats } from 'Selectors/creepStats';
import { findHostileCreeps } from 'Selectors/findHostileCreeps';
import { getTerritoriesByOffice } from 'Selectors/getTerritoriesByOffice';
import { isCreep } from 'Selectors/typeguards';

export default {
  byTick: () => {},
  byOffice: (office: string): SpawnOrder[] => {
    const orders = [];

    if (!activeMissions(office).some(isMission(MissionType.DEFEND_REMOTE))) {
      for (const t of getTerritoriesByOffice(office)) {
        const [threatLevel, hostileScore] = Memory.rooms[t].threatLevel ?? [ThreatLevel.UNKNOWN, 0];
        if (Memory.rooms[t].invaderCore) {
          // Hostile minions or invader core detected
          orders.push(createDefendRemoteOrder(office, true));
        } else if (hostileScore > 0) {
          // If hostileScore is too great, will be removed from Territories
          orders.push(createDefendRemoteOrder(office));
        }
      }
    }

    const hostiles = creepStats(findHostileCreeps(office));
    const allies = creepStats(
      activeMissions(office).filter(isMission(MissionType.DEFEND_OFFICE)).map(assignedCreep).filter(isCreep)
    );
    if (hostiles.count) {
      // Hostiles in room; calculate defenders needed
      if (Math.max(hostiles.attack, hostiles.rangedAttack) > allies.attack) {
        if (!activeSquadMissions(office).some(isSquadMission(SquadMissionType.ATTACKER_HEALER_DUO))) {
          createAttackerHealerDuoMission(office);
        }
      }
    }

    return orders;
  }
};
