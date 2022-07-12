import { HEAL_RANGE, RANGED_HEAL_RANGE } from "gameConstants";
import { findHostileCreeps, findHostileCreepsInRange } from "Selectors/findHostileCreeps";
import { roomPlans } from "Selectors/roomPlans";
import { towerDamage } from "Selectors/towerDamage";

export const runTowers = () => {
  for (let office in Memory.offices) {
    const plan = roomPlans(office);
    if (!plan?.headquarters || !Game.rooms[office]) return;

    // Count active towers

    // Select the target that will take the most damage
    const targets = findHostileCreeps(office);
    let priorityTarget: Creep | undefined = undefined;
    let bestDamage = 0;
    for (let target of targets) {
      const damage = plan.headquarters.towers.reduce((sum, t) =>
        sum + towerDamage(t.structure as StructureTower | undefined, target.pos
        ), 0)
      const exitRange = target.pos.findClosestByRange(FIND_EXIT)?.getRangeTo(target) ?? 50
      const selfHeal = target.getActiveBodyparts(HEAL) * HEAL_POWER;
      const allyHeal = findHostileCreepsInRange(target.pos, RANGED_HEAL_RANGE).reduce((sum, ally) => {
        return sum + (ally.getActiveBodyparts(HEAL) * (ally.pos.inRangeTo(target.pos, HEAL_RANGE) ? HEAL_POWER : RANGED_HEAL_POWER))
      }, 0)
      const netDamage = (exitRange > 2) ? (damage - (selfHeal + allyHeal)) : 0; // Assume creeps within range of an exit will escape for healing
      if (netDamage > bestDamage) {
        priorityTarget = target;
        bestDamage = netDamage;
      }
    }

    // Attack the target, if found
    if (priorityTarget) {
      for (let t of plan.headquarters.towers) {
        if (!t.structure) continue;
        (t.structure as StructureTower).attack(priorityTarget);
      }
    }
  }
}
