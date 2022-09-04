import { moveTo } from 'screeps-cartographer';
import { resourcesNearPos } from 'Selectors/resourcesNearPos';
import { roomPlans } from 'Selectors/roomPlans';
import profiler from 'utils/profiler';
import { BehaviorResult } from './Behavior';

export const getResourcesFromMineContainer = profiler.registerFN((creep: Creep, office: string) => {
  // Default to specified franchise
  const plan = roomPlans(office)?.mine;
  const container = plan?.container.structure as StructureContainer | undefined;
  if (!plan || !container) return BehaviorResult.FAILURE;

  if (
    (resourcesNearPos(container.pos).length === 0 && container.store.getUsedCapacity() === 0) ||
    creep.store.getFreeCapacity() === 0
  ) {
    return BehaviorResult.SUCCESS; // Mine container drained
  } else {
    // First, pick up from container
    const resourceType = Object.keys(container.store)[0] as ResourceConstant | undefined;
    if (resourceType && container.store.getUsedCapacity(resourceType) > 0) {
      moveTo(creep, { pos: container.pos, range: 1 });
      creep.withdraw(container, resourceType);
    } else {
      // Otherwise, pick up loose resources
      const res = resourcesNearPos(plan.extractor.pos, 1).shift();
      if (res) {
        moveTo(creep, { pos: res.pos, range: 1 });
        creep.pickup(res);
      }
    }
  }

  return BehaviorResult.INPROGRESS;
}, 'getResourcesFromMineContainer');
