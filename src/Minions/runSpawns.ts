import { adjacentWalkablePositions } from "Selectors/MapCoordinates";
import { getSpawns } from "Selectors/roomPlans";
import profiler from "utils/profiler";

export const runSpawns = profiler.registerFN((office: string) => {
    getSpawns(office).forEach(s => {
        if (s.spawning && s.spawning.remainingTime < 2 && !adjacentWalkablePositions(s.pos).length) {
            _.sample(s.pos.findInRange(FIND_MY_CREEPS, 1))?.giveWay();
        }
    })
}, 'runSpawns')
