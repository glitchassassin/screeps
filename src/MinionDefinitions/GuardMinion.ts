import { Minion } from "./Minion";

export class GuardMinion extends Minion {
    type = 'GUARD'
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Try to maintain ATTACK/MOVE ratio
            let attackParts = Math.min(25, Math.floor(((1/2) * energy) / 80))
            return [
                ...Array(attackParts).fill(ATTACK),
                ...Array(attackParts).fill(MOVE),
            ]
        }
    }
}
