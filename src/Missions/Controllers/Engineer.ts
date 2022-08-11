import { createEngineerMission } from 'Missions/Implementations/Engineer';
import { MissionType } from 'Missions/Mission';
import {
  activeMissions,
  and,
  isMission,
  not,
  pendingAndActiveMissions,
  pendingMissions,
  submitMission
} from 'Missions/Selectors';
import { franchisesThatNeedRoadWork } from 'Selectors/Franchises/franchisesThatNeedRoadWork';
import { franchiseThatNeedsEngineers } from 'Selectors/Franchises/franchiseThatNeedsEngineers';
import { hasEnergyIncome } from 'Selectors/hasEnergyIncome';
import { rcl } from 'Selectors/rcl';
import { facilitiesCostPending } from 'Selectors/Structures/facilitiesWorkToDo';

export default {
  byTick: () => {},
  byOffice: (office: string) => {
    const pending = pendingMissions(office).filter(isMission(MissionType.ENGINEER));
    const active = activeMissions(office).filter(isMission(MissionType.ENGINEER));
    const queuedRegularMissions = [...pending, ...active].filter(m => !m.data.franchise);

    // if (queuedMissions.some(isStatus(MissionStatus.PENDING))) return; // Only one pending Engineer mission at a time

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
      return;
    }

    if (franchises.length === 0) {
      // Clear pending Engineer missions
      Memory.offices[office].pendingMissions = pendingMissions(office).filter(
        not(and(isMission(MissionType.ENGINEER), mission => !!mission.data.franchise))
      );
      return;
    }

    if (rcl(office) >= 3 && hasEnergyIncome(office) && pending.filter(m => m.data.franchise).length < 2) {
      const nextFranchise = franchiseThatNeedsEngineers(
        office,
        pendingAndActiveMissions(office).filter(isMission(MissionType.ENGINEER))
      );
      if (nextFranchise) submitMission(office, createEngineerMission(office, nextFranchise));
    }
  }
};
