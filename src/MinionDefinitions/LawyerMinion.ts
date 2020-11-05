import { Minion } from "./Minion";

export class LawyerMinion extends Minion {
    type = 'LAWYER'
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Equal claim and move parts
            let claimParts = Math.min(25, Math.floor(((600/650) * energy) / 600))
            return [
                ...Array(claimParts).fill(CLAIM),
                ...Array(claimParts).fill(MOVE),
            ]
        }
    }
}
