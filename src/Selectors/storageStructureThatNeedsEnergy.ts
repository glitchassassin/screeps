import { getSpawns, roomPlans } from './roomPlans';
import { getExtensions } from './spawnsAndExtensionsDemand';
import { isCreep } from './typeguards';

function toMostEmpty(a?: AnyStoreStructure, b?: AnyStoreStructure) {
  if (!a) return b;
  if (!b) return a;
  if (a.store[RESOURCE_ENERGY] >= a.store.getCapacity(RESOURCE_ENERGY)) return b;
  if (a.store[RESOURCE_ENERGY] <= b.store[RESOURCE_ENERGY]) return a;
  return b;
}

export const CreepsThatNeedEnergy = new Set<string>();

/**
 *
 * @param office
 * @returns Tuple of (priority, target)
 */
export function storageStructureThatNeedsEnergy(office: string): [number, AnyStoreStructure | Creep][] {
  const hq = roomPlans(office)?.headquarters;
  const fastfiller = roomPlans(office)?.fastfiller;
  const backfill = roomPlans(office)?.backfill;
  const library = roomPlans(office)?.library;
  const labs = roomPlans(office)?.labs;
  const creeps = [...CreepsThatNeedEnergy]
    .map(c => Game.creeps[c])
    .filter(isCreep)
    .filter(c => c.store.getFreeCapacity(RESOURCE_ENERGY) > 10);
  const structures = ([] as [number, AnyStoreStructure | Creep][])
    .concat(
      backfill?.towers.map(s => [10, s.structure as AnyStoreStructure]) ?? [],
      fastfiller?.containers.map(s => [9, s.structure as AnyStoreStructure]) ?? [],
      getSpawns(office).map(s => [8, s as AnyStoreStructure]) ?? [],
      getExtensions(office, false).map(s => [7, s.structure as AnyStoreStructure]),
      labs?.labs.map(s => [6, s.structure as AnyStoreStructure]) ?? [],
      [[4, library?.container.structure as AnyStoreStructure]],
      creeps.map(e => [4, e]),
      [[3, hq?.storage.structure as AnyStoreStructure]]
    )
    .filter(
      ([_, structure]) => structure && structure.store[RESOURCE_ENERGY] < structure.store.getCapacity(RESOURCE_ENERGY)
    );
  return structures;
}
