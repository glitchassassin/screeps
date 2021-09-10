import { FranchiseObjectives } from "Objectives/Franchise";
import { byId } from "./byId";
import { adjacentWalkablePositions } from "./MapCoordinates";
import { posById } from "./posById";

export const franchiseIsFull = (creep: Creep, id?: Id<Source>) => {
    const pos = posById(id)
    if (id && FranchiseObjectives[`FranchiseObjective|${id}`]?.assigned.reduce((sum, creep) => sum + (byId(creep)?.getActiveBodyparts(WORK) ?? 0), 0) >= 5) return true;
    if (!pos || !Game.rooms[pos.roomName]) return false; // Can't find the source, don't know if it's full

    return adjacentWalkablePositions(pos, false).length === 0;
}
