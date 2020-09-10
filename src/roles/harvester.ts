import { harvest } from "behaviors/harvest";
import { deposit } from "behaviors/deposit";

export const run = (creep: Creep) => {
    return harvest(creep) || deposit(creep);
}
