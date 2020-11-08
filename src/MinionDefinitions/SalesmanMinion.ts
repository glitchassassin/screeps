import { Minion } from "./Minion";

/**
 * Dedicated Miner: moves to mine and dumps resources into container, does not haul
 */
export class SalesmanMinion extends Minion {
    type = 'SALESMAN'
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        } else {
            let workParts = Math.min(5, Math.floor((energy - 50) / 100));
            let moveParts = 1;
            return [
                ...Array(workParts).fill(WORK),
                ...Array(moveParts).fill(MOVE),
            ]
        }
    }
}
