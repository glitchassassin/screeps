import { harvest } from "behaviors/harvest";
import { deposit } from "behaviors/deposit";
import { depositInPlace } from "behaviors/depositInPlace";

export const run = (creep: Creep) => {
    return harvest(creep) || depositInPlace(creep);
}
