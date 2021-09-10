import { byId } from "Selectors/byId";
import { debugCPU, resetDebugCPU } from "utils/debugCPU";
import profiler from "utils/profiler";
import { PrioritizedObjectives } from "./initializeObjectives";


const DEBUG = false;

export const spawnObjectives = profiler.registerFN(() => {
    if (DEBUG) resetDebugCPU();
    for (let o of PrioritizedObjectives) {
        o.assigned = o.assigned.filter(c => byId(c)?.memory.objective === o.id); // Clear out dead/renassigned minions
        o.spawn();
        if (DEBUG) debugCPU(o.id);
    }
}, 'spawnObjectives')
