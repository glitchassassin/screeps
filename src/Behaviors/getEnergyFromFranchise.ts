import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { posById } from 'Selectors/posById';
import { resourcesNearPos } from 'Selectors/resourcesNearPos';
import { getFranchisePlanBySourceId } from 'Selectors/roomPlans';
import { moveByPath, moveTo } from 'screeps-cartographer';
import { BehaviorResult } from './Behavior';

export const getEnergyFromFranchise = (creep: Creep, office: string, franchise: Id<Source>) => {
  const pos = posById(franchise);
  if (!pos) return BehaviorResult.FAILURE;

  // TODO: This is vulnerable to edge cases where the creep needs to pick up a resource, but
  // the shortest path leads outside the room.
  if (creep.pos.roomName !== pos.roomName) {
    moveByPath(creep, office + franchise);
    return BehaviorResult.INPROGRESS;
  }

  if (franchiseEnergyAvailable(franchise) < 50 || creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
    return BehaviorResult.SUCCESS;
  }

  // First, pick up from container
  const container = getFranchisePlanBySourceId(franchise)?.container.structure as StructureContainer | undefined;
  if (container && container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
    moveByPath(creep, office + franchise);
    creep.withdraw(container, RESOURCE_ENERGY);
    return BehaviorResult.INPROGRESS;
  }

  const resources = resourcesNearPos(pos, 1, RESOURCE_ENERGY);
  if (resources.length > 0) {
    // Otherwise, pick up loose resources
    const res = resources.shift();
    if (res) {
      moveTo(creep, { pos: res.pos, range: 1 });
      creep.pickup(res);
    }
  }

  return BehaviorResult.INPROGRESS;
}
