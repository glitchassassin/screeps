import { MissionType } from 'Missions/Mission';
import { activeMissions, assignedCreep, isMission } from 'Missions/Selectors';
import { rcl } from './rcl';
import { getSpawns, roomPlans } from './roomPlans';
import { getExtensions } from './spawnsAndExtensionsDemand';

function toMostEmpty(a?: AnyStoreStructure, b?: AnyStoreStructure) {
  if (!a) return b;
  if (!b) return a;
  if (a.store[RESOURCE_ENERGY] >= a.store.getCapacity(RESOURCE_ENERGY)) return b;
  if (a.store[RESOURCE_ENERGY] <= b.store[RESOURCE_ENERGY]) return a;
  return b;
}

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
  const engineers =
    rcl(office) < 3
      ? (activeMissions(office)
          .filter(isMission(MissionType.ENGINEER))
          .map(m => assignedCreep(m))
          .filter(c => c && !c.spawning) as Creep[])
      : [];
  const structures = ([] as [number, AnyStoreStructure | Creep][])
    .concat(
      fastfiller?.containers.map(s => [10, s.structure as AnyStoreStructure]) ?? [],
      getSpawns(office).map(s => [9, s as AnyStoreStructure]) ?? [],
      getExtensions(office, false).map(s => [8, s.structure as AnyStoreStructure]),
      backfill?.towers.map(s => [7, s.structure as AnyStoreStructure]) ?? [],
      labs?.labs.map(s => [6, s.structure as AnyStoreStructure]) ?? [],
      [[4, library?.container.structure as AnyStoreStructure]],
      engineers.map(e => [3, e]),
      [[1, hq?.storage.structure as AnyStoreStructure]]
    )
    .filter(
      ([_, structure]) => structure && structure.store[RESOURCE_ENERGY] < structure.store.getCapacity(RESOURCE_ENERGY)
    );
  return structures;
}
