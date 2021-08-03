export type CreepCount = Record<string, Record<string, number>>;

let creeps: CreepCount = {};

export const resetCreepCount = () => {
    creeps = {};
}

export const countCreep = (creep: Creep) => {
    creeps[creep.memory.office] ??= {}
    creeps[creep.memory.office][creep.memory.type] ??= 0
    creeps[creep.memory.office][creep.memory.type] += 1;
}

export const creepCount = () => creeps;
