import { getExitTiles } from "./getExitTiles";
import { controllerPosition, mineralPosition, sourcePositions } from "./roomCache";
import { isRoomPosition } from "./typeguards";

/**
 * Returns true if there is a path from origin to
 * each source, the mineral, the controller, and at
 * least one exit square
 */
export const validatePathsToPointsOfInterest = (room: string, costMatrix: CostMatrix, origin: RoomPosition) => {
    const pointsOfInterest = ([] as (RoomPosition|undefined)[]).concat(
        sourcePositions(room),
        [
            mineralPosition(room),
            controllerPosition(room)
        ]
    ).filter(isRoomPosition)
    const exits = getExitTiles(room);

    for (const pos of pointsOfInterest) {
        const path = PathFinder.search(
            origin,
            {pos, range: 1},
            {maxRooms: 1, roomCallback: () => costMatrix, plainCost: 2, swampCost: 10}
        );
        if (path.incomplete) return false;
    }
    for (const pos of exits) {
        const path = PathFinder.search(
            origin,
            {pos, range: 1},
            {maxRooms: 1, roomCallback: () => costMatrix, plainCost: 2, swampCost: 10}
        );
        if (!path.incomplete) return true;
    }
    return false;
}
