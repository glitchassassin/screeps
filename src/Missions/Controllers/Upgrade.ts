import { SpawnOrder } from 'Minions/spawnQueues';
import { createUpgradeOrder } from 'Missions/Implementations/Upgrade';
import { MissionType } from 'Missions/Mission';
import { activeMissions, isMission } from 'Missions/Selectors';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { calculateNearbyPositions, isPositionWalkable } from 'Selectors/Map/MapCoordinates';
import { rcl } from 'Selectors/rcl';
import { controllerPosition } from 'Selectors/roomCache';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';

export default {
  byTick: () => {},
  byOffice: (office: string): SpawnOrder[] => {
    if (rcl(office) < 2) return [];
    const tooMuchEnergy = storageEnergyAvailable(office) > STORAGE_CAPACITY / 2;
    const maxUpgraders =
      rcl(office) === 8
        ? 1
        : calculateNearbyPositions(controllerPosition(office)!, 3).filter(pos => isPositionWalkable(pos, true, false))
            .length;
    if (tooMuchEnergy || Game.rooms[office].controller!.ticksToDowngrade < 10000) {
      const maxMissions = tooMuchEnergy ? maxUpgraders : 1;
      if (activeMissions(office).filter(isMission(MissionType.UPGRADE)).length >= maxMissions) {
        return []; // Enough missions scheduled
      }
      return [createUpgradeOrder(office, true)];
    }

    // Only one pending upgrade mission at a time, post RCL 1; only one active, if
    // we have construction to do or we are at RCL8

    if (
      hasEnergyIncome(office) &&
      activeMissions(office).filter(isMission(MissionType.UPGRADE)).length < maxUpgraders
    ) {
      return [createUpgradeOrder(office, false)];
    }

    return [];
  }
};
