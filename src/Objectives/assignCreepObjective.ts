import { PrioritizedObjectives } from ".";

export const assignCreepObjective = (creep: Creep) => {
    if (!creep.memory.objective) {
        for (let objective of PrioritizedObjectives) {
            if (objective.assign(creep)) {
                break;
            }
        }
    }
}
