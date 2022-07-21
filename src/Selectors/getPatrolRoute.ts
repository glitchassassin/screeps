import profiler from "utils/profiler";
import { calculateNearbyRooms } from "./Map/MapCoordinates";

let patrols = new Map<string, string[]>();

export const getPatrolRoute = profiler.registerFN((office: string) => {
    if (!patrols.has(office)) {
        patrols.set(office, generatePatrolRoute(office));
    }
    return patrols.get(office) as string[];
}, 'getPatrolRoute')

/**
 * Generates a naive patrol route sorted by proximity to the central room
 */
const generatePatrolRoute = (office: string) => {
    // console.log('generating patrol route for', office)
    let surveyRadius = (Game.rooms[office]?.controller?.level !== 8) ? 5 : 20
    let rooms = calculateNearbyRooms(office, surveyRadius, false).sort((a, b) =>
        Game.map.getRoomLinearDistance(a, office) - Game.map.getRoomLinearDistance(b, office)
    )
    return rooms;
}
