import { sourceIds } from '../roomCache';
import { franchiseDisabled } from './franchiseDisabled';
import { getFranchiseDistance } from './getFranchiseDistance';
import { remoteFranchises } from './remoteFranchises';

export const franchisesByOffice = (officeName: string) => {
  // TODO: Add sources from territories, limited by spawns
  return sourceIds(officeName)
    .map(source => ({
      source,
      room: officeName,
      remote: false,
      distance: getFranchiseDistance(officeName, source) ?? 0
    }))
    .concat(
      remoteFranchises(officeName)
        .filter(f => !franchiseDisabled(officeName, f.source))
        .map(f => ({ ...f, remote: true, distance: getFranchiseDistance(officeName, f.source) ?? 0 }))
    )
    .filter(({ distance }) => distance < 250)
    .sort((a, b) => a.distance - b.distance);
};
