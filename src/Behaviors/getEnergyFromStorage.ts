import { getPrimarySpawn } from 'Selectors/getPrimarySpawn';
import { roomPlans } from 'Selectors/roomPlans';
import profiler from 'utils/profiler';
import { BehaviorResult } from './Behavior';
import { moveTo } from './moveTo';

export const getEnergyFromStorage = profiler.registerFN(
  (creep: Creep, office: string, limit?: number, ignoreSpawn = false): BehaviorResult => {
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return BehaviorResult.SUCCESS;

    const hq = roomPlans(office)?.headquarters;
    const storage = hq?.storage.structure as StructureStorage | undefined;
    const container = roomPlans(office)
      ?.fastfiller?.containers.map(c => c.structure as StructureContainer | undefined)
      .find(c => c?.store[RESOURCE_ENERGY]) as StructureContainer | undefined;
    const spawn = getPrimarySpawn(office) as StructureSpawn | undefined;

    const withdrawLimit = limit ?? Game.rooms[office]?.energyCapacityAvailable;

    let target = undefined;
    if ((storage?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) > withdrawLimit) {
      target = storage;
    } else if ((container?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) > withdrawLimit) {
      target = container;
    } else if (!storage && !container && !ignoreSpawn && (spawn?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) >= 300) {
      target = spawn;
    }

    if (!target) {
      return BehaviorResult.FAILURE;
    }

    if (creep.name.startsWith('ENGINEER')) Game.map.visual.line(creep.pos, target.pos, { color: '#00ffff' });

    moveTo(creep, { pos: target.pos, range: 1 });
    if (creep.withdraw(target, RESOURCE_ENERGY) === OK) {
      return BehaviorResult.SUCCESS;
    }
    return BehaviorResult.INPROGRESS;
  },
  'getEnergyFromStorage'
);
