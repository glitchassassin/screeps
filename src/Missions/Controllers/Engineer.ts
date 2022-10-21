import { SpawnOrder } from 'Minions/spawnQueues';
import { createEngineerOrder } from 'Missions/Implementations/Engineer';
import { MissionType } from 'Missions/Mission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { rcl } from 'Selectors/rcl';
import { facilitiesCostPending } from 'Selectors/Structures/facilitiesWorkToDo';

export default {
  name: 'Engineer',
  byTick: () => {},
  byOffice: (office: string): SpawnOrder[] => {
    const active = activeMissions(office).filter(isMission(MissionType.ENGINEER));
    const queuedRegularMissions = active.filter(m => !m.data.franchise);

    // Calculate effective work for active missions
    const workPending = queuedRegularMissions
      .filter(m => !m.data.franchise)
      .reduce((sum, m) => sum + m.data.workParts * CREEP_LIFE_TIME, 0);
    let pendingCost = facilitiesCostPending(office);

    // If rcl < 2, engineers will also upgrade
    if (rcl(office) < 2) {
      const controller = Game.rooms[office].controller;
      pendingCost += (controller?.progressTotal ?? 0) - (controller?.progress ?? 0);
    }

    // Set up regular Engineer missions

    if (hasEnergyIncome(office) && pendingCost > workPending) {
      return [createEngineerOrder(office)];
    }

    return [];
  }
};
