import { harvest } from "behaviors/harvest";
import { build } from "behaviors/build";

export const run = (creep: Creep) => {
    if(creep.memory.building && creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.building = false;
        creep.say('🔄 harvesting');
    }
    if(!creep.memory.building && creep.store.getFreeCapacity() == 0) {
        creep.memory.building = true;
        creep.say('🚧 building');
    }

    if(creep.memory.building) {
        build(creep);
    }
    else {
        harvest(creep);
    }
    return true;
}
