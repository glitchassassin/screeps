import { Minion } from "./Minion";

export class ParalegalMinion extends Minion {
    type = 'PARALEGAL'
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Max for an upgrader at RCL8 is 15 energy/tick, so we'll cap these there
            let workParts = Math.floor(((energy - 50) * 3/4) / 100)
            let moveParts = Math.floor(((energy - 50) * 1/4) / 50)
            return [...Array(workParts).fill(WORK), CARRY, ...Array(moveParts).fill(MOVE)]
        }
    }
}
