import { BehaviorResult } from 'Behaviors/Behavior';
import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';

export const fromDroppedResource = (creep: Creep, resourceId: Id<Resource>) => {
  const resource = byId(resourceId);
  if (!resource) return BehaviorResult.FAILURE;

  moveTo(creep, resource);
  if (creep.pickup(resource) === OK) {
    return BehaviorResult.SUCCESS;
  }
  return BehaviorResult.INPROGRESS;
};
