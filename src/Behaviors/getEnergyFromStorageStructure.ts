import { moveTo } from 'screeps-cartographer';
import { byId } from 'Selectors/byId';
import { BehaviorResult } from './Behavior';

declare global {
  interface CreepMemory {
    targetStructure?: Id<AnyStoreStructure>;
  }
}

export const getEnergyFromStorageStructure = (creep: Creep, office: string, limit?: number): BehaviorResult => {
  if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return BehaviorResult.SUCCESS;

  const structure = byId(creep.memory.targetStructure);

  const withdrawLimit =
    structure instanceof StructureSpawn
      ? SPAWN_ENERGY_CAPACITY
      : limit ?? Game.rooms[office]?.energyCapacityAvailable ?? 0;

  if (!structure || structure.store.getUsedCapacity(RESOURCE_ENERGY) < withdrawLimit) return BehaviorResult.FAILURE;

  moveTo(creep, structure);
  if (creep.withdraw(structure, RESOURCE_ENERGY) === OK) {
    return BehaviorResult.SUCCESS;
  }
  return BehaviorResult.INPROGRESS;
};
