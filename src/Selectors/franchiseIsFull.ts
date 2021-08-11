import { adjacentWalkablePositions } from "./MapCoordinates";
import { posById } from "./posById";

export const franchiseIsFull = (creep: Creep, id?: Id<Source>) => {
    const pos = posById(id)
    if (!pos || !Game.rooms[pos.roomName]) return false; // Can't find the source, don't know if it's full

    return adjacentWalkablePositions(pos, false).length === 0;
}
