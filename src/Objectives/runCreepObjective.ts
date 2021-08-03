import { Objectives } from "./initializeObjectives";

export const resetObjectivesCapacity = () => {
    for (let o in Objectives) {
        Objectives[o].resetCapacity();
    }
}

export const runCreepObjective = (creep: Creep) => {
    if (!creep.memory.objective) return;
    Objectives[creep.memory.objective].action(creep);
    if (!creep.memory.objective) return;
    Objectives[creep.memory.objective].updateCapacity(creep);
}
