import { franchisePath } from 'Selectors/plannedTerritoryRoads';
import { BehaviorResult } from './Behavior';
import { moveTo } from './moveTo';

export const followPathHomeFromSource = (creep: Creep, office: string, sourceId: Id<Source>) => {
  const sourcePath = franchisePath(office, sourceId).slice().reverse();

  if (creep.pos.roomName === office) return BehaviorResult.SUCCESS;

  return moveTo(
    creep,
    sourcePath.map(pos => ({ pos, range: 0 })),
    { followPath: true }
  );
};
