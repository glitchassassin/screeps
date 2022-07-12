import { memoize } from "utils/memoizeFunction";
import { posById } from "./posById";
import { roomPlans } from "./roomPlans";

export const getFranchiseDistance = memoize(
  (office: string, sourceId: Id<Source>) => office + posById(sourceId) + roomPlans(office)?.headquarters?.storage.pos,
  (office: string, sourceId: Id<Source>) => {
    const sourcePos = posById(sourceId);
    const franchise = Memory.rooms[sourcePos?.roomName ?? '']?.franchises[office]?.[sourceId];
    return franchise ? (franchise.path.length / 27) : undefined;
  }
)
