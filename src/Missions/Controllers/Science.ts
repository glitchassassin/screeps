import { SpawnOrder } from 'Minions/spawnQueues';
import { createScienceOrder } from 'Missions/Implementations/Science';
import { MissionType } from 'Missions/Mission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { roomPlans } from 'Selectors/roomPlans';

export default {
  byTick: () => {},
  byOffice: (office: string): SpawnOrder[] => {
    if (!roomPlans(office)?.labs?.labs[0].structure) return [];
    if (Memory.offices[office].lab.orders.length === 0 && Memory.offices[office].lab.boosts.length === 0) return [];

    // Maintain one Scientist
    if (!activeMissions(office).find(isMission(MissionType.SCIENCE))) {
      return [createScienceOrder(office)];
    }
    return [];
  }
};
