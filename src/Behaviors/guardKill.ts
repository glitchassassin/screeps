import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";

export const guardKill = (creep: Creep, target?: Creep|Structure) => {
  if (target && moveTo(creep, { pos: target.pos, range: 1 }) === BehaviorResult.SUCCESS) {
    creep.attack(target);
  } else if (creep.hits < creep.hitsMax) {
    creep.heal(creep);
  }
}
