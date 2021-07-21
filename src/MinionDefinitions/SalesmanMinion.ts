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
            let moveParts = (energy <= 550) ? 1 : 2;
            let carryParts = 1;
            let workParts = Math.min(5, Math.floor((energy - (moveParts + carryParts) * 50) / 100));
            return [
                ...Array(workParts).fill(WORK),
                ...Array(moveParts).fill(MOVE),
                ...Array(carryParts).fill(CARRY),
            ]
        }
    }
}
