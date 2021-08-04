import { PrioritizedObjectives } from "./initializeObjectives";
import { byId } from "Selectors/byId";
import { spawns } from "Selectors/roomPlans";

export const spawnObjectives = (room: string) => {
    let s = spawns(room);
    for (let o of PrioritizedObjectives) {
        if (s.length === 0) break;
        o.assigned = o.assigned.filter(byId); // Clear out dead minions
        const spawnedCount = o.spawn(room, s);
        // console.log(o.id, ':', spawnedCount);
        // Remove any booked spawns and continue
        s = s.slice(spawnedCount);
    }
}
