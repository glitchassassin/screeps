import { Minion } from "./Minion";

export class InternMinion extends Minion {
    type = 'INTERN'
    scaleMinion = (energy: number) => {
        return [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE];
    }
}
