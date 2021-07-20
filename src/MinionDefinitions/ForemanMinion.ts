import { Minion } from "./Minion";

export class ForemanMinion extends Minion {
    type = 'FOREMAN'
    scaleMinion = (energy: number) => {
        if (energy < 550) {
            return [];
        }
        else {
            // Maintain 5-1 WORK-MOVE ratio
            let workParts = Math.min(40, Math.floor((10/11 * energy) / 100))
            let moveParts = Math.min(8, Math.floor((1/11 * energy) / 50))
            return [...Array(workParts).fill(WORK), ...Array(moveParts).fill(MOVE)]
        }
    }
}
