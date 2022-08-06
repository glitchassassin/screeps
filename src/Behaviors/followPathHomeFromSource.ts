import { franchisePath } from 'Selectors/plannedTerritoryRoads';
import { BehaviorResult } from './Behavior';
import { moveTo } from './moveTo';

export const followPathHomeFromSource = (creep: Creep, office: string, sourceId: Id<Source>) => {
  const sourcePath = franchisePath(office, sourceId).reverse();

  if (
    moveTo(
      creep,
      sourcePath.map(pos => ({ pos, range: 0 }))
    ) === BehaviorResult.SUCCESS
  ) {
    const result = creep.moveByPath(sourcePath);
    if (result !== OK && result !== ERR_TIRED) {
      // unrecoverable error
      return BehaviorResult.FAILURE;
    }
  }

  if (creep.pos.roomName === office) return BehaviorResult.SUCCESS;
  return BehaviorResult.INPROGRESS;
};
