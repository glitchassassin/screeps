import { Minion } from "./Minion";

/**
 * Dedicated Miner: moves to mine and dumps resources into container, does not haul
 */
export class SalesmanMinion extends Minion {
    type = 'SALESMAN'
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        } else if (energy <= 550) {
            let workParts = Math.min(5, Math.floor((energy - 50) / 100));
            let moveParts = 1;
            return [
                ...Array(workParts).fill(WORK),
                ...Array(moveParts).fill(MOVE)
            ]
        } else {
            let workParts = Math.min(10, Math.floor((energy - 150) / 100));
            let moveParts = 2;
            let carryParts = 1;
            return [
                ...Array(workParts).fill(WORK),
                ...Array(moveParts).fill(MOVE),
                ...Array(carryParts).fill(CARRY),
            ]
        }
    }
}
