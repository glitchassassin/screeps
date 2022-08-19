import { PlannedStructure } from 'RoomPlanner/PlannedStructure';
import { memoizeByTick } from 'utils/memoizeFunction';
import { rcl } from './rcl';
import { getSpawns, roomPlans } from './roomPlans';

export const getExtensions = (room: string, includeFastfiller = true) => {
  const plan = roomPlans(room);
  if (!plan) return [];
  return ([] as (PlannedStructure | undefined)[])
    .concat(
      includeFastfiller ? plan.fastfiller?.extensions ?? [] : [],
      plan.headquarters?.extension,
      plan.franchise1?.extensions ?? [],
      plan.franchise2?.extensions ?? [],
      plan.extensions?.extensions ?? [],
      plan.backfill?.extensions ?? []
    )
    .filter((s): s is PlannedStructure => !!s);
};

export const getEnergyStructures = memoizeByTick(
  room => room,
  (room: string) => {
    const plan = roomPlans(room);
    if (!plan) return [];
    const structures = getExtensions(room)
      .map(s => s?.structure)
      .concat(getSpawns(room))
      .filter(s => s) as (StructureExtension | StructureSpawn)[];

    if (Memory.rooms[room].rclMilestones?.[rcl(room) + 1]) {
      // Room is downleveled
      return structures.filter(e => e.isActive());
    }
    return structures;
  }
);

export const extensionsDemand = (room: string) => {
  return getExtensions(room).reduce((sum, s) => {
    return sum + ((s.structure as StructureExtension)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0);
  }, 0);
};
