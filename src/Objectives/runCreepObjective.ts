import profiler from "screeps-profiler";
import { Objectives } from "./Objective";

export const runCreepObjective = profiler.registerFN((creep: Creep) => {
    if (!creep.memory.objective || !Objectives[creep.memory.objective]) return;
    if (!Objectives[creep.memory.objective].assigned.includes(creep.id)) {
        Objectives[creep.memory.objective].assigned.push(creep.id);
    }
    if (creep.spawning) return;
    Objectives[creep.memory.objective].action(creep);
}, 'runCreepObjective')