import { memoizeByTick } from 'utils/memoizeFunction';
import { posById } from '../posById';
import { franchisesByOffice } from './franchisesByOffice';
import { getFranchiseDistance } from './getFranchiseDistance';

export const franchiseActive = (office: string, source: Id<Source>) => {
  const room = posById(source)?.roomName ?? '';
  const lastHarvested = Memory.rooms[room]?.franchises[office]?.[source]?.lastHarvested;
  return lastHarvested && lastHarvested + 1500 > Game.time;
};

export const activeFranchises = (office: string) =>
  franchisesByOffice(office).filter(source => franchiseActive(office, source.source));

export const furthestActiveFranchiseRoundTripDistance = memoizeByTick(
  office => office,
  (office: string) => {
    return (
      Math.max(10, ...activeFranchises(office).map(franchise => getFranchiseDistance(office, franchise.source) ?? 0)) *
      2
    );
  }
);
