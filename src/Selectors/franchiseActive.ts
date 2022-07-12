import { posById } from "./posById";

export const franchiseActive = (office: string, source: Id<Source>) => {
  const room = posById(source)?.roomName ?? '';
  const lastHarvested = Memory.rooms[room]?.franchises[office]?.[source]?.lastHarvested;
  return (lastHarvested && lastHarvested + 3000 > Game.time)
}
