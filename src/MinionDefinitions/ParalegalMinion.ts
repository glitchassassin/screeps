import { Minion } from "./Minion";

export class ParalegalMinion extends Minion {
    type = 'PARALEGAL'
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Max for an upgrader at RCL8 is 15 energy/tick, so we'll cap these there
            let workParts = Math.min(15, Math.floor((energy - 100) / 100))
            return [...Array(workParts).fill(WORK), CARRY, MOVE]
        }
    }
}
