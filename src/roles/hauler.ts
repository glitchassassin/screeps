import { withdraw } from "behaviors/withdraw";
import { deposit } from "behaviors/deposit";

export const run = (creep: Creep) => {
    if (!creep.memory.route) return false;

    if(creep.store[RESOURCE_ENERGY] == 0) {
        // go to green named flag
        const startRoute = Object.values(Game.flags).find(flag => (
            flag.color === COLOR_GREEN &&
            flag.name === `sr${creep.memory.route}`
        ))
        if (!startRoute) return false;
        if (creep.pos.isEqualTo(startRoute)) {
            console.log(`[${creep.name}] Arrived at startRoute`);
            withdraw(creep);
        } else {
            creep.moveTo(startRoute);
        }
    }
    else {
        const endRoute = Object.values(Game.flags).find(flag => (
            flag.color === COLOR_RED &&
            flag.name === `er${creep.memory.route}`
        ))
        if (!endRoute) return false;
        if (creep.pos.isEqualTo(endRoute)) {
            deposit(creep, [STRUCTURE_CONTAINER, STRUCTURE_EXTENSION, STRUCTURE_SPAWN]);
        } else {
            creep.moveTo(endRoute);
        }
    }
    return true;
}
