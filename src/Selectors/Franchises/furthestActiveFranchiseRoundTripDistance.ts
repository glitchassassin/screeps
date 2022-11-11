import { memoizeByTick } from 'utils/memoizeFunction';
import { activeFranchises } from './franchiseActive';
import { getFranchiseDistance } from './getFranchiseDistance';

export const furthestActiveFranchiseRoundTripDistance = memoizeByTick(
  office => office,
  (office: string) => {
    return (
      Math.max(10, ...activeFranchises(office).map(franchise => getFranchiseDistance(office, franchise.source) ?? 0)) *
      2
    );
  }
);
