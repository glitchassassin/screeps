import { memoize } from "utils/memoizeFunction";
import { getCostMatrix } from "./MapCoordinates";
import { posById } from "./posById";
import { roomPlans } from "./roomPlans";

export const getFranchiseDistance = memoize(
  (office: string, sourceId: Id<Source>) => office + posById(sourceId) + roomPlans(office)?.headquarters?.storage.pos,
  (office: string, sourceId: Id<Source>) => {
    const storagePos = roomPlans(office)?.headquarters?.storage.pos;
    const sourcePos = posById(sourceId);
    if (!storagePos || !sourcePos) return undefined;
    const path = PathFinder.search(storagePos, { pos: sourcePos, range: 1 }, {
      roomCallback: (room) => {
        return getCostMatrix(room, false)
      }
    })
    if (path.incomplete) return undefined;
    return path.cost;
  }
)
