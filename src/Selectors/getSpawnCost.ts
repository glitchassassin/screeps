import { getSpawns } from "./roomPlans";

const spawning = new Set<string>()

export function getSpawnCost(office: string) {
    let cost = 0;
    for (let c of spawning) {
        if (!Game.creeps[c]?.spawning) spawning.delete(c);
    }
    getSpawns(office).forEach(s => {
        if (s.spawning && !spawning.has(s.spawning.name) && Game.creeps[s.spawning.name]) {
            spawning.add(s.spawning.name);
            cost += Game.creeps[s.spawning.name].body.reduce((sum, p) => sum + BODYPART_COST[p.type], 0)
        }
    })
    return cost;
}
