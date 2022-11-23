import { sum } from 'Selectors/reducers';
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

export const averageActiveFranchiseRoundTripDistance = memoizeByTick(
  office => office,
  (office: string) => {
    const total = activeFranchises(office)
      .map(franchise => getFranchiseDistance(office, franchise.source) ?? 0)
      .reduce(sum, 0);
    const average = (Math.max(10, total) * 2) / activeFranchises(office).length;
    return average;
  }
);
