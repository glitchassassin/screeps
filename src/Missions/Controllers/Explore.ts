import { SpawnOrder } from 'Minions/spawnQueues';
import { createExploreOrder } from 'Missions/Implementations/Explore';
import { MissionType } from 'Missions/Mission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';

export default {
  name: 'Explore',
  byTick: () => {},
  byOffice: (office: string): SpawnOrder[] => {
    if (activeMissions(office).some(isMission(MissionType.EXPLORE))) return []; // Only one pending logistics mission at a time

    if (hasEnergyIncome(office) || Memory.roomPlans[office]?.office === false) {
      return [createExploreOrder(office)];
    }
    return [];
  }
};
