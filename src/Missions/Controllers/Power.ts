import { FEATURES, MAX_POWER_BANK_DISTANCE } from 'config';
import { SpawnOrder } from 'Minions/spawnQueues';
import { activeSquadMissions, isSquadMission } from 'Missions/Selectors';
import { SquadMissionType } from 'Missions/Squads';
import { createPowerBankMission } from 'Missions/Squads/Implementations/PowerBank';

export default {
  name: 'Power',
  byTick: () => {},
  byOffice: (office: string): SpawnOrder[] => {
    if (!FEATURES.POWER) return [];
    // Only one active power bank mission per office
    if (activeSquadMissions(office).some(isSquadMission(SquadMissionType.POWER_BANK))) return [];

    for (const report of Memory.offices[office].powerbanks
      .slice()
      .sort((a, b) => (a.powerCost ?? 1000) - (b.powerCost ?? 1000))) {
      if (!report.distance || report.distance > MAX_POWER_BANK_DISTANCE || report.expires - Game.time < 3000) continue;
      console.log('Create power bank mission', office, JSON.stringify(report));
      createPowerBankMission(office, report);
      break;
    }

    return [];
  }
};
