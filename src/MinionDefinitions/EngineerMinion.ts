import { Minion } from "./Minion";

export class EngineerMinion extends Minion {
    type = 'ENGINEER'
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Try to maintain WORK/CARRY/MOVE ratio
            let workParts = Math.min(25, Math.floor(((1/2) * energy) / 100))
            let carryMoveParts = Math.min(12, Math.floor(((1/4) * energy) / 50))
            return [
                ...Array(workParts).fill(WORK),
                ...Array(carryMoveParts).fill(CARRY),
                ...Array(carryMoveParts).fill(MOVE)
            ]
        }
    }
}
