import { cachePath } from 'screeps-cartographer';
import { getCostMatrix } from 'Selectors/Map/Pathing';
import { getFranchisePlanBySourceId, roomPlans } from 'Selectors/roomPlans';
import { getTerritoryIntent, TerritoryIntent } from 'Selectors/territoryIntent';

export function planFranchisePath(office: string, source: Id<Source>) {
  const storage = roomPlans(office)?.headquarters?.storage.pos;
  const harvestPos = getFranchisePlanBySourceId(source)?.container.pos;
  if (!storage || !harvestPos) return [];
  return (
    cachePath(
      office + source,
      storage,
      { pos: harvestPos, range: 1 },
      {
        roomCallback: (room: string) => {
          if (getTerritoryIntent(room) === TerritoryIntent.AVOID) return false;
          return getCostMatrix(room, false, { territoryPlannedRoadsCost: 1, roomPlan: Boolean(Memory.offices[room]) });
        },
        plainCost: 2,
        swampCost: 2,
        roadCost: 1,
        maxOps: 100000,
        reusePath: 100000
      }
    ) ?? []
  );
}
