import { memoizeByTick } from 'utils/memoizeFunction';
import { posById } from '../posById';
import { resourcesNearPos } from '../resourcesNearPos';
import { getFranchisePlanBySourceId } from '../roomPlans';

const franchiseEnergyCache = new Map<Id<Source>, number>();

export const franchiseEnergyAvailable = memoizeByTick(
  source => source,
  (source: Id<Source>) => {
    const pos = posById(source);
    if (!pos) return 0;

    if (!Game.rooms[pos.roomName]) return franchiseEnergyCache.get(source) ?? 0;

    const container = getFranchisePlanBySourceId(source)?.container.structure as StructureContainer | undefined;

    let amount =
      resourcesNearPos(pos, 1, RESOURCE_ENERGY).reduce((sum, r) => sum + r.amount, 0) +
      (container?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0);
    franchiseEnergyCache.set(source, amount);

    return amount;
  }
);
