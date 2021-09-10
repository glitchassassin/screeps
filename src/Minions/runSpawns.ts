import { adjacentWalkablePositions } from "Selectors/MapCoordinates";
import { getSpawns, roomPlans } from "Selectors/roomPlans";
import profiler from "utils/profiler";

export const runSpawns = profiler.registerFN((office: string) => {
    const spawns = getSpawns(office);
    if (spawns.length === 0) {
        // place initial spawn site
        roomPlans(office)?.headquarters?.spawn.pos.createConstructionSite(STRUCTURE_SPAWN);
    }
    spawns.forEach(s => {
        if (s.spawning && adjacentWalkablePositions(s.pos).length === 0) {
            if (s.spawning.remainingTime < 2) {
                s.pos.findInRange(FIND_MY_CREEPS, 1).forEach(c => c.move(s.pos.getDirectionTo(c.pos.x, c.pos.y)));
            }
        }
    })
}, 'runSpawns')
