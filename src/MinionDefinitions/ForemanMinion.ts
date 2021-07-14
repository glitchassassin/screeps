import { Minion } from "./Minion";

export class ForemanMinion extends Minion {
    type = 'FOREMAN'
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Maintain 5-1 WORK-MOVE ratio
            let workParts = Math.floor((10/11 * energy) / 100)
            let moveParts = Math.floor((1/11 * energy) / 50)
            return [...Array(workParts).fill(WORK), ...Array(moveParts).fill(MOVE)]
        }
    }
}
