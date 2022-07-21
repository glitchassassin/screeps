import { getRangeTo } from "Selectors/Map/MapCoordinates";
import { moveTo } from "./moveTo";

export const blinkyKill = (creep: Creep, target?: Creep|Structure) => {
  const kite = (target instanceof Creep && target.body.some(p => p.type === ATTACK));
  if (target) {
    if (kite && getRangeTo(creep.pos, target.pos) < 3) {
      moveTo(creep, { pos: target.pos, range: 3 }, { flee: true });
    } else {
      moveTo(creep, { pos: target.pos, range: 1 });
    }
    if (getRangeTo(creep.pos, target.pos) === 1 && !(target instanceof StructureWall)) {
      return creep.rangedMassAttack() === OK;
    } else {
      return creep.rangedAttack(target) === OK;
    }
  }
  return false;
}
