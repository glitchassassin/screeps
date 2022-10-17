import { SpawnOrder } from 'Minions/spawnQueues';
import { createHQLogisticsOrder } from 'Missions/Implementations/HQLogistics';
import { MissionType } from 'Missions/Mission';
import { activeMissions, and, isMission, missionExpired, not } from 'Missions/Selectors';
import { rcl } from 'Selectors/rcl';
import { roomPlans } from 'Selectors/roomPlans';

export default {
  byTick: () => {},
  byOffice: (office: string): SpawnOrder[] => {
    if (rcl(office) < 3) return [];
    // Maintain Tower Logistics minion, as needed

    if (!roomPlans(office)?.headquarters?.link.structure) return []; // not worth it maintaining just for storage + spawn
    // Maintain one HQ Logistics minion
    if (!activeMissions(office).some(and(isMission(MissionType.HQ_LOGISTICS), not(missionExpired)))) {
      // start immediately
      return [createHQLogisticsOrder(office)];
    }

    return [];
  }
};
