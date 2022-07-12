import { getRangeTo } from "Selectors/MapCoordinates";
import { moveTo } from "./moveTo";

export const blinkyKill = (creep: Creep, target?: Creep|Structure) => {
  if (target) {
    if (getRangeTo(creep.pos, target.pos) < 3) {
      moveTo(creep, { pos: target.pos, range: 3 }, { flee: true });
    } else {
      moveTo(creep, { pos: target.pos, range: 3 });
    }
    creep.rangedAttack(target);
  }
  creep.heal(creep);
}
