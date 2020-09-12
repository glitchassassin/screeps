import { harvest } from "behaviors/harvest";
import { upgrade } from "behaviors/upgrade";
import { withdraw } from "behaviors/withdraw";

export const run = (creep: Creep) => {
    if(creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.upgrading = false;
    }
    if(!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
        creep.memory.upgrading = true;
    }

    if(creep.memory.upgrading) {
        upgrade(creep);
    }
    else {
        if (creep.room.controller?.level === 1) {
            withdraw(creep, [STRUCTURE_SPAWN, STRUCTURE_CONTAINER]);
        }
        else {
            withdraw(creep, [STRUCTURE_CONTAINER]) || harvest(creep);
        }
    }
}
