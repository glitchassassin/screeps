import { Minion } from "./Minion";

export class AccountantMinion extends Minion {
    type = 'ACCOUNTANT';
    scaleMinion = (energy: number) => {
        // 2/3 CARRY, 1/3 MOVE
        let moveParts = Math.min(16, Math.floor(energy/3/50))
        let carryParts = Math.min(32, 2 * moveParts);

        return [...Array(carryParts).fill(CARRY), ...Array(moveParts).fill(MOVE)];
    }
}
