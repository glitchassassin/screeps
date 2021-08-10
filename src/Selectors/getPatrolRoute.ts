import profiler from "utils/profiler";
import { calculateNearbyRooms } from "./MapCoordinates";

let patrols = new Map<string, string[]>();

export const getPatrolRoute = profiler.registerFN((creep: Creep) => {
    if (!patrols.has(creep.memory.office)) {
        patrols.set(creep.memory.office, generatePatrolRoute(creep.memory.office));
    }
    return patrols.get(creep.memory.office) as string[];
}, 'getPatrolRoute')

/**
 * Generates a naive patrol route sorted by proximity to the central room
 */
const generatePatrolRoute = (office: string) => {
    let surveyRadius = (Game.rooms[office]?.controller?.level !== 8) ? 5 : 20
    let rooms = calculateNearbyRooms(office, surveyRadius, false).sort((a, b) =>
        Game.map.getRoomLinearDistance(a, office) - Game.map.getRoomLinearDistance(b, office)
    )
    return rooms;
}
