import { franchiseEnergyAvailable } from 'Selectors/Franchises/franchiseEnergyAvailable';
import { posById } from 'Selectors/posById';
import { resourcesNearPos } from 'Selectors/resourcesNearPos';
import { getFranchisePlanBySourceId } from 'Selectors/roomPlans';
import profiler from 'utils/profiler';
import { BehaviorResult } from './Behavior';
import { moveTo } from './moveTo';

export const getEnergyFromFranchise = profiler.registerFN((creep: Creep, office: string, franchise: Id<Source>) => {
  const pos = posById(franchise);
  if (!pos) return BehaviorResult.FAILURE;

  if (pos.roomName !== creep.pos.roomName) {
    return moveTo(creep, { pos, range: 2 });
  }

  if (franchiseEnergyAvailable(franchise) <= 50 || creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
    return BehaviorResult.SUCCESS;
  } else {
    if (creep.name.startsWith('ENGINEER')) Game.map.visual.line(creep.pos, pos, { color: '#ffff00' });
    // First, pick up from container
    const container = getFranchisePlanBySourceId(franchise)?.container.structure as StructureContainer | undefined;
    const resources = resourcesNearPos(pos, 1, RESOURCE_ENERGY);
    if (container && container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
      if (moveTo(creep, { pos: container.pos, range: 1 }) === BehaviorResult.SUCCESS) {
        const result = creep.withdraw(container, RESOURCE_ENERGY);
        // if (result === OK)
        //   LogisticsLedger.record(
        //     office,
        //     'collect',
        //     Math.min(creep.store.getFreeCapacity(RESOURCE_ENERGY), container.store.getUsedCapacity(RESOURCE_ENERGY))
        //   );
      }
    } else if (resources.length > 0) {
      // Otherwise, pick up loose resources
      const res = resources.shift();
      if (res) {
        if (moveTo(creep, { pos: res.pos, range: 1 }) === BehaviorResult.SUCCESS) {
          const result = creep.pickup(res);
          // if (result === OK)
          //   LogisticsLedger.record(
          //     office,
          //     'collect',
          //     Math.min(creep.store.getFreeCapacity(RESOURCE_ENERGY), res.amount)
          //   );
        }
      }
    }
  }

  return BehaviorResult.INPROGRESS;
}, 'getEnergyFromFranchise');
