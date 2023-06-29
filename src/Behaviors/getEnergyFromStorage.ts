import { getClosestByRange } from 'Selectors/Map/MapCoordinates';
import { getPrimarySpawn } from 'Selectors/getPrimarySpawn';
import { roomPlans } from 'Selectors/roomPlans';
import { moveTo } from 'screeps-cartographer';
import profiler from 'utils/profiler';
import { BehaviorResult } from './Behavior';

export const getEnergyFromStorage = profiler.registerFN(
  (creep: Creep, office: string, limit?: number, ignoreSpawn = false): BehaviorResult => {
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return BehaviorResult.SUCCESS;

    const { headquarters, library } = roomPlans(office) ?? {};
    const storage = headquarters?.storage.structure as StructureStorage | undefined;
    const containers =
      roomPlans(office)?.fastfiller?.containers.map(c => c.structure as StructureContainer | undefined) ?? [];
    if (library?.container.structure) containers.unshift(library.container.structure as StructureContainer);
    const container =
      getClosestByRange(
        creep.pos,
        containers.filter((c): c is StructureContainer => !!c?.store[RESOURCE_ENERGY])
      ) ?? (containers[0] as StructureContainer | undefined);
    const spawn = getPrimarySpawn(office) as StructureSpawn | undefined;

    const withdrawLimit = limit ?? Game.rooms[office]?.energyCapacityAvailable;

    let target = undefined;
    if ((storage?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) > withdrawLimit) {
      target = storage;
    } else if (
      containers.reduce((sum, c) => sum + (c?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0), 0) > withdrawLimit
    ) {
      target = container;
    } else if (!storage && !container && !ignoreSpawn && (spawn?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) >= 300) {
      target = spawn;
    }

    if (!target) {
      return BehaviorResult.FAILURE;
    }

    moveTo(creep, { pos: target.pos, range: 1 });
    if (creep.withdraw(target, RESOURCE_ENERGY) === OK) {
      return BehaviorResult.SUCCESS;
    }
    return BehaviorResult.INPROGRESS;
  },
  'getEnergyFromStorage'
);
