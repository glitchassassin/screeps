import { adjacentWalkablePositions } from "Selectors/MapCoordinates";
import { spawns } from "Selectors/roomPlans";
import profiler from "utils/profiler";

export const runSpawns = profiler.registerFN((office: string) => {
    spawns(office).forEach(s => {
        if (s.spawning && !adjacentWalkablePositions(s.pos).length) {
            _.sample(s.pos.findInRange(FIND_MY_CREEPS, 1))?.giveWay();
        }
    })
}, 'runSpawns')
