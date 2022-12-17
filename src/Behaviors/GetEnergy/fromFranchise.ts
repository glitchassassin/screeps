import { moveTo } from 'screeps-cartographer';
import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { posById } from 'Selectors/posById';
import { resourcesNearPos } from 'Selectors/resourcesNearPos';
import { getFranchisePlanBySourceId } from 'Selectors/roomPlans';
import { BehaviorResult } from '../Behavior';

/**
 * Returns SUCCESS if expected to complete this tick, FAILURE if it
 * cannot complete (or source is depleted), INPROGRESS otherwise
 */
export const fromFranchise = (creep: Creep, sourceId: Id<Source>) => {
  const sourcePos = posById(sourceId);
  if (!sourcePos) return BehaviorResult.FAILURE;
  if (!Game.rooms[sourcePos.roomName]) {
    moveTo(creep, { pos: sourcePos, range: 2 });
    return BehaviorResult.INPROGRESS;
  }

  if (franchiseEnergyAvailable(sourceId) < 50) {
    return BehaviorResult.SUCCESS;
  }

  const container = getFranchisePlanBySourceId(sourceId)?.container.structure as StructureContainer | undefined;
  const resources = resourcesNearPos(sourcePos, 1, RESOURCE_ENERGY);
  let pickedUp = 0;
  if (container && container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
    // Get from container, if possible
    moveTo(creep, { pos: container.pos, range: 1 });
    if (creep.withdraw(container, RESOURCE_ENERGY) === OK) {
      pickedUp += container.store.getUsedCapacity(RESOURCE_ENERGY);
    }
  } else if (resources.length > 0) {
    // Otherwise, pick up loose resources
    const res = resources.shift();
    if (res) {
      moveTo(creep, { pos: res.pos, range: 1 });
      if (creep.pickup(res) === OK) {
        pickedUp += res.amount;
      }
    }
  }

  if (creep.store.getFreeCapacity(RESOURCE_ENERGY) <= pickedUp) {
    return BehaviorResult.SUCCESS;
  }

  return BehaviorResult.INPROGRESS;
};
