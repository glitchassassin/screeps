import { createUpgradeMission } from 'Missions/Implementations/Upgrade';
import { MissionType } from 'Missions/Mission';
import {
  activeMissions,
  isMission,
  pendingAndActiveMissions,
  pendingMissions,
  submitMission
} from 'Missions/Selectors';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { calculateNearbyPositions, isPositionWalkable } from 'Selectors/Map/MapCoordinates';
import { rcl } from 'Selectors/rcl';
import { controllerPosition } from 'Selectors/roomCache';
import { roomPlans } from 'Selectors/roomPlans';
import { storageEnergyAvailable } from 'Selectors/storageEnergyAvailable';

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    const tooMuchEnergy = storageEnergyAvailable(office) > STORAGE_CAPACITY / 2;
    if (tooMuchEnergy) {
      const maxMissions = calculateNearbyPositions(controllerPosition(office)!, 3).filter(pos =>
        isPositionWalkable(pos, true, false)
      ).length;
      pendingMissions(office)
        .filter(isMission(MissionType.UPGRADE))
        .forEach(m => (m.priority = 10));
      if (pendingAndActiveMissions(office).filter(isMission(MissionType.UPGRADE)).length >= maxMissions) {
        return; // Enough missions scheduled
      }
    } else if (
      pendingMissions(office).filter(isMission(MissionType.UPGRADE)).length >= 2 ||
      (!roomPlans(office)?.library?.container.structure && !roomPlans(office)?.library?.link.structure) ||
      (activeMissions(office).some(isMission(MissionType.UPGRADE)) && rcl(office) === 8) //  || pendingMissions(office).some(isMission(MissionType.ENGINEER))
    ) {
      pendingMissions(office)
        .filter(isMission(MissionType.UPGRADE))
        .forEach(m => (m.priority = 8));
      const pendingMission = pendingMissions(office).find(isMission(MissionType.UPGRADE));
      if (pendingMission && Game.rooms[office].controller!.ticksToDowngrade < 10000) {
        pendingMission.data.emergency = true;
      }
      return;
    }

    // Only one pending upgrade mission at a time, post RCL 1; only one active, if
    // we have construction to do or we are at RCL8

    if (hasEnergyIncome(office)) {
      submitMission(office, createUpgradeMission(office));
    }
  }
};
