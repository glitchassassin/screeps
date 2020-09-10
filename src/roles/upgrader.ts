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
        withdraw(creep);
    }
}
