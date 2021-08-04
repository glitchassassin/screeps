import { adjacentWalkablePositions } from "Selectors/MapCoordinates";
import { spawns } from "Selectors/roomPlans";

export const runSpawns = (office: string) => {
    spawns(office).forEach(s => {
        if (s.spawning?.needTime === 0 && !adjacentWalkablePositions(s.pos).length) {
            _.sample(s.pos.findInRange(FIND_MY_CREEPS, 1))?.giveWay();
        }
    })
}
