import { SpawnOrder } from 'Minions/spawnQueues';
import { activeSquadMissions } from 'Missions/Selectors';
import { getSquadMission } from 'Missions/Squads/getSquadMission';

export default {
  name: 'SquadMissions',
  byTick: () => {},
  byOffice: (office: string): SpawnOrder[] => {
    return activeSquadMissions(office)?.flatMap(m => getSquadMission(m).spawn()) ?? [];
  }
};
