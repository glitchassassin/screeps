import { memoizeByTick } from "utils/memoizeFunction";
import { franchisesByOffice } from "./franchisesByOffice";
import { posById } from "./posById";

export const franchiseActive = (office: string, source: Id<Source>) => {
  const room = posById(source)?.roomName ?? '';
  const lastHarvested = Memory.rooms[room]?.franchises[office]?.[source]?.lastHarvested;
  return (lastHarvested && lastHarvested + 3000 > Game.time)
}

export const activeFranchises = (office: string) => franchisesByOffice(office).filter(source => franchiseActive(office, source.source));

export const furthestActiveFranchiseRoundTripDistance = memoizeByTick(
  office => office,
  (office: string) => {
    let distance = 10; // default estimate
    for (const franchise of activeFranchises(office)) {
      const newDistance = Memory.rooms[franchise.room].franchises[office][franchise.source].path.length / 27;
      if (newDistance > distance) distance = newDistance;
    }
    return distance * 2;
  }
)
