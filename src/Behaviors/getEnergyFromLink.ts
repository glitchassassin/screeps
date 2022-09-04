import { moveTo } from 'screeps-cartographer';
import { roomPlans } from 'Selectors/roomPlans';
import profiler from 'utils/profiler';
import { BehaviorResult } from './Behavior';

export const getEnergyFromLink = profiler.registerFN((creep: Creep, office: string): BehaviorResult => {
  if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return BehaviorResult.SUCCESS;

  const link = roomPlans(office)?.headquarters?.link.structure as StructureLink | undefined;
  if (!link || link.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return BehaviorResult.FAILURE;

  moveTo(creep, { pos: link.pos, range: 1 });
  if (creep.withdraw(link, RESOURCE_ENERGY) === OK) {
    return BehaviorResult.SUCCESS;
  }
  return BehaviorResult.INPROGRESS;
}, 'getEnergyFromLink');
