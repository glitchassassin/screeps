import { sourceIds } from '../roomCache';
import { franchiseDisabled } from './franchiseDisabled';
import { getFranchiseDistance } from './getFranchiseDistance';
import { remoteFranchises } from './remoteFranchises';

export const franchisesByOffice = (officeName: string, includeDisabled = false) => {
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
        .filter(f => includeDisabled || !franchiseDisabled(officeName, f.source))
        .map(f => ({ ...f, remote: true, distance: getFranchiseDistance(officeName, f.source) ?? Infinity }))
    )
    .filter(({ distance }) => distance < 250)
    .sort((a, b) => a.distance - b.distance);
};
