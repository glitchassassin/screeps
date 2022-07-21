import { countTerrainTypes } from "./Map/MapCoordinates";

/**
 * Requires vision
 */
export const roomIsEligibleForOffice = (roomName: string) => {
    // Room must have a controller and two sources
    // To avoid edge cases, controller and sources must not be within range 5 of each other or an exit square
    let controller = Game.rooms[roomName].controller?.pos
    if (!controller) {
        console.log(`Room planning for ${roomName} failed - No controller`);
        return false;
    }
    let sources = Game.rooms[roomName].find(FIND_SOURCES).map(s => s.pos);
    if (!sources || sources.length < 2) {
        console.log(`Room planning for ${roomName} failed - Invalid number of sources`);
        return false;
    }

    let [source1, source2] = sources;
    if (controller.findClosestByRange(FIND_EXIT)?.inRangeTo(controller, 2)) {
        console.log(`Room planning for ${roomName} failed - Controller too close to exit`);
        return false;
    }
    if (sources.some(s => s.findClosestByRange(FIND_EXIT)?.inRangeTo(s, 2))) {
        console.log(`Room planning for ${roomName} failed - Source too close to exit`);
        return false;
    }
    if (source1.getRangeTo(source2) < 3) {
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
