import { moveByPath } from 'screeps-cartographer';
import { BehaviorResult } from './Behavior';

export const followPathHomeFromSource = (creep: Creep, office: string, sourceId: Id<Source>) => {
  if (creep.pos.roomName === office) return BehaviorResult.SUCCESS;
  moveByPath(creep, office + sourceId, { reverse: true });
  return BehaviorResult.INPROGRESS;
};
