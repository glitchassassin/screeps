import { harvest } from "behaviors/harvest";
import { upgrade } from "behaviors/upgrade";
import { build } from "behaviors/build";
import { deposit } from "behaviors/deposit";
import { repair } from "behaviors/repair";

enum MODES {
    HARVESTING,
    BUILDING,
    REPAIRING,
    DEPOSITING,
    UPGRADING,
    WAITING
}

export const run = (creep: Creep) => {
    switch (creep.memory.mode) {
        case MODES.HARVESTING:
            if (creep.store.getFreeCapacity() > 0) {
                // if empty, harvest resources until full
                harvest(creep)
                break;
            }
            else {
                // if full, look for a building to construct
                creep.memory.mode = MODES.BUILDING;
            }
        case MODES.BUILDING:
            // if there is a building, build it
            if (build(creep)) break;
            // otherwise, look for something to repair
            creep.memory.mode = MODES.REPAIRING;
        case MODES.REPAIRING:
            // If there is something to repair, repair it
            if (repair(creep)) break;
            // otherwise, look for somewhere to deposit loot
            creep.memory.mode = MODES.DEPOSITING;
        case MODES.DEPOSITING:
            // If there is somewhere to deposit loot, do so
            if (deposit(creep)) break;
            // otherwise, upgrade the room controller
            creep.memory.mode = MODES.UPGRADING;
        case MODES.UPGRADING:
            // If we can upgrade the room controller, do so
            if (upgrade(creep)) break;
            // Otherwise, complain, and start the cycle over
            creep.say("I'm bored!")
        default:
            creep.memory.mode = MODES.HARVESTING;
    }
    if(creep.store[RESOURCE_ENERGY] == 0) {
        creep.memory.mode = MODES.HARVESTING;
        creep.say('🔄 harvesting');
    }
}
