import { sourceIds } from '../roomCache';
import { franchiseDisabled } from './franchiseDisabled';
import { getFranchiseDistance } from './getFranchiseDistance';
import { remoteFranchises } from './remoteFranchises';

export const franchisesByOffice = (officeName: string) => {
  // TODO: Add sources from territories, limited by spawns
  return sourceIds(officeName)
    .map(source => ({ source, room: officeName, remote: false }))
    .concat(
      remoteFranchises(officeName)
        .filter(f => !franchiseDisabled(officeName, f.source))
        .map(f => ({ ...f, remote: true }))
    )
    .sort(
      (a, b) => (getFranchiseDistance(officeName, a.source) ?? 0) - (getFranchiseDistance(officeName, b.source) ?? 0)
    );
};
