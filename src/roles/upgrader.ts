import { harvest } from "behaviors/harvest";
import { upgrade } from "behaviors/upgrade";

export const run = (creep: Creep) => {
    if(creep.memory.upgrading && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.upgrading = false;
        creep.say('🔄 harvesting');
    }
    if(!creep.memory.upgrading && creep.store.getFreeCapacity() == 0) {
        creep.memory.upgrading = true;
        creep.say('⚡ upgrading');
    }

    if(creep.memory.upgrading) {
        upgrade(creep);
    }
    else {
        harvest(creep);
    }
}
