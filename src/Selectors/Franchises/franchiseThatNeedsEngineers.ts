import { EngineerMission } from 'Missions/OldImplementations/Engineer';
import { assignedCreep } from 'Missions/Selectors';
import { adjustedPlannedFranchiseRoadsCost } from '../plannedTerritoryRoads';
import { rcl } from '../rcl';
import { franchisesThatNeedRoadWork } from './franchisesThatNeedRoadWork';

export const franchiseThatNeedsEngineers = (office: string, missions: EngineerMission[], includeFull = false) => {
  if (rcl(office) < 3) return undefined;
  const remotes = franchisesThatNeedRoadWork(office);
  if (!remotes.length) return undefined;

  const assignedCapacity = missions.reduce((sum, m) => {
    if (m.data.franchise)
      sum[m.data.franchise] =
        (sum[m.data.franchise] ?? 0) + m.data.workParts * (assignedCreep(m)?.ticksToLive ?? CREEP_LIFE_TIME);
    return sum;
  }, <Record<Id<Source>, number>>{});

  let min, minAssigned;
  for (const source of remotes) {
    // For active missions, I want to get the franchise with the least work assigned; for new
    // missions, I want to return nothing if there is already enough capacity assigned
    const workAssigned = assignedCapacity[source] ?? 0;
    const costRemaining = adjustedPlannedFranchiseRoadsCost(office, source) - workAssigned;
    if (!includeFull && costRemaining <= 0) continue;

    if (!min || minAssigned === undefined || workAssigned < minAssigned) {
      min = source;
      minAssigned = workAssigned;
    }
  }

  return min;
};
