import { countTerrainTypes } from "./MapCoordinates";
import { posById } from "./posById";

/**
 * Requires vision
 */
export const roomIsEligibleForOffice = (roomName: string) => {
    // Room must have a controller and two sources
    // To avoid edge cases, controller and sources must not be within range 5 of each other or an exit square
    let controller = posById(Memory.rooms[roomName]?.controllerId)
    if (!controller) {
        console.log(`Room planning for ${roomName} failed - No controller`);
        return false;
    }
    let sources = Memory.rooms[roomName]?.sourceIds?.map(id => posById(id))
        .filter(s => s) as RoomPosition[];
    if (!sources || sources.length < 2) {
        console.log(`Room planning for ${roomName} failed - Invalid number of sources`);
        return false;
    }

    let [source1, source2] = sources;
    if (controller.findClosestByRange(FIND_EXIT)?.inRangeTo(controller, 5)) {
        console.log(`Room planning for ${roomName} failed - Controller too close to exit`);
        return false;
    }
    if (sources.some(s => s.findClosestByRange(FIND_EXIT)?.inRangeTo(s, 5))) {
        console.log(`Room planning for ${roomName} failed - Source too close to exit`);
        return false;
    }
    if (controller.inRangeTo(source1, 5)) {
        console.log(`Room planning for ${roomName} failed - Source too close to controller`);
        return false;
    }
    if (controller.getRangeTo(source2) < 5) {
        console.log(`Room planning for ${roomName} failed - Source too close to controller`);
        return false;
    }
    if (source1.getRangeTo(source2) < 5) {
        console.log(`Room planning for ${roomName} failed - Sources too close together`);
        return false;
    }

    const terrainTypeCount = countTerrainTypes(roomName);

    if ((terrainTypeCount.swamp * 1.5) > terrainTypeCount.plains) {
        console.log(`Room planning for ${roomName} failed - Too much swamp`);
        return false;
    }
    return true;
}
