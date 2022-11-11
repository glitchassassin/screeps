import { posById } from '../posById';
import { franchisesByOffice } from './franchisesByOffice';

export const franchiseActive = (office: string, source: Id<Source>, sinceTicks = 1500) => {
  const room = posById(source)?.roomName ?? '';
  const lastHarvested = Memory.rooms[room]?.franchises[office]?.[source]?.lastActive;
  return lastHarvested && lastHarvested + sinceTicks >= Game.time;
};

export const activeFranchises = (office: string, sinceTicks = 1500) =>
  franchisesByOffice(office).filter(source => franchiseActive(office, source.source, sinceTicks));
