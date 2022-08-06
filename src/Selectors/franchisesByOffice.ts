import { getFranchiseDistance } from './getFranchiseDistance';
import { remoteFranchises } from './remoteFranchises';
import { sourceIds } from './roomCache';

export const franchisesByOffice = (officeName: string) => {
  // TODO: Add sources from territories, limited by spawns
  return sourceIds(officeName)
    .map(source => ({ source, room: officeName, remote: false }))
    .concat(remoteFranchises(officeName).map(f => ({ ...f, remote: true })))
    .sort(
      (a, b) => (getFranchiseDistance(officeName, a.source) ?? 0) - (getFranchiseDistance(officeName, b.source) ?? 0)
    );
};
