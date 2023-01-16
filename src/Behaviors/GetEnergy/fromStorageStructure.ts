import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { BehaviorResult } from '../Behavior';

export const fromStorageStructure = (creep: Creep, structureId: Id<Ruin | AnyStoreStructure>) => {
  const structure = byId(structureId);
  if (!structure?.store.getUsedCapacity(RESOURCE_ENERGY)) return BehaviorResult.FAILURE;

  moveTo(creep, { pos: structure.pos, range: 1 });
  if (creep.withdraw(structure, RESOURCE_ENERGY) === OK) {
    return BehaviorResult.SUCCESS;
  }
  return BehaviorResult.INPROGRESS;
};
