import { createEngineerMission } from 'Missions/Implementations/Engineer';
import { MissionType } from 'Missions/Mission';
import { and, isMission, not, pendingAndActiveMissions, pendingMissions, submitMission } from 'Missions/Selectors';
import { franchiseThatNeedsEngineers } from 'Selectors/franchiseThatNeedsEngineers';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { franchisesThatNeedRoadWork } from 'Selectors/plannedTerritoryRoads';
import { rcl } from 'Selectors/rcl';
import { facilitiesCostPending } from 'Selectors/Structures/facilitiesWorkToDo';

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    const queuedMissions = pendingAndActiveMissions(office).filter(isMission(MissionType.ENGINEER));

    // if (queuedMissions.some(isStatus(MissionStatus.PENDING))) return; // Only one pending Engineer mission at a time

    // Calculate effective work for active missions
    const workPending = queuedMissions
      .filter(m => !m.data.franchise)
      .reduce((sum, m) => sum + m.data.workParts * CREEP_LIFE_TIME, 0);
    let pendingCost = facilitiesCostPending(office);

    // If rcl < 2, engineers will also upgrade
    if (rcl(office) < 2) {
      const controller = Game.rooms[office].controller;
      pendingCost += (controller?.progressTotal ?? 0) - (controller?.progress ?? 0);
    }

    let franchises = franchisesThatNeedRoadWork(office);

    // Set up regular Engineer missions

    if (pendingCost === 0) {
      // Clear pending Engineer missions
      Memory.offices[office].pendingMissions = pendingMissions(office).filter(
        not(and(isMission(MissionType.ENGINEER), mission => !mission.data.franchise))
      );
    }

    if (hasEnergyIncome(office) && pendingCost > workPending) {
      submitMission(office, createEngineerMission(office));
    }

    if (franchises.length === 0) {
      // Clear pending Engineer missions
      Memory.offices[office].pendingMissions = pendingMissions(office).filter(
        not(and(isMission(MissionType.ENGINEER), mission => !!mission.data.franchise))
      );
    }

    if (hasEnergyIncome(office) && pendingCost === 0 && queuedMissions.length < franchises.length) {
      const nextFranchise = franchiseThatNeedsEngineers(
        office,
        pendingAndActiveMissions(office).filter(isMission(MissionType.ENGINEER))
      );
      submitMission(office, createEngineerMission(office, nextFranchise));
    }
  }
};
