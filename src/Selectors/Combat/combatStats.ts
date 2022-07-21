import { memoize } from "utils/memoizeFunction";

/**
 * Returns base multipliers, e.g. `stats.heal * HEAL_POWER` to calculate actual healing potential
 */
export const combatStats = memoize(
  creep => creep.name,
  (creep: Creep) => {
    const stats = {
      hits: creep.hits,
      hitsMax: creep.hitsMax,
      attack: 0,
      rangedAttack: 0,
      heal: 0,
      rangedHeal: 0,
      mitigation: 1,
      dismantle: 0,
      harvest: 0,
      build: 0,
      speed: 0,
      score: 0
    }

    if (creep.body[0].type === TOUGH) {
      // damage mitigation
      const boost = creep.body[0].boost;
      if (boost) {
        stats.mitigation *= BOOSTS[TOUGH][boost].damage;
      }
    }

    let fatigueGeneration = 0;
    let fatigueMitigation = 0;

    for (const p of creep.body) {
      if (p.hits) {
        if (p.type === HEAL) {
          let heal = 1;
          let rangedHeal = 1;
          if (p.boost) {
            heal *= BOOSTS[HEAL][p.boost].heal;
            rangedHeal *= BOOSTS[HEAL][p.boost].rangedHeal;
          }
          stats.heal += heal;
          stats.rangedHeal += rangedHeal;
        } else if (p.type === ATTACK) {
          let attack = 1;
          if (p.boost) {
            attack *= BOOSTS[ATTACK][p.boost].attack;
          }
          stats.attack += attack;
        } else if (p.type === RANGED_ATTACK) {
          let rangedAttack = 1;
          if (p.boost) {
            rangedAttack *= BOOSTS[RANGED_ATTACK][p.boost].rangedAttack;
          }
          stats.rangedAttack += rangedAttack;
        } else if (p.type === WORK) {
          let dismantle = 1;
          let build = 1;
          let harvest = 1;
          if (p.boost) {
            const boostEffects = BOOSTS[WORK][p.boost];
            if ('harvest' in boostEffects) harvest *= boostEffects.harvest;
            if ('build' in boostEffects) build *= boostEffects.build;
            if ('dismantle' in boostEffects) dismantle *= boostEffects.dismantle;
          }
          stats.harvest += harvest;
          stats.build += build;
          stats.dismantle += dismantle;
        } else if (p.type === MOVE) {
          let move = 1;
          if (p.boost) {
            move *= BOOSTS[MOVE][p.boost].fatigue;
          }
          fatigueMitigation += move;
        }

        if (p.type !== MOVE && p.type !== CARRY) {
          fatigueGeneration += 1;
        }
      }
    }

    stats.speed = fatigueMitigation ? Math.min(1, fatigueGeneration / fatigueMitigation) : 0;

    // Overall danger heuristic, stolen from Overmind
    stats.score = stats.rangedAttack + (stats.attack / 2) + (stats.heal / stats.mitigation);

    return stats;
  }
)

export const totalCreepStats = (creeps: Creep[]) => {
  const sum = creeps.reduce((sum, creep) => {
    sum.count += 1;
    const stats = combatStats(creep);
    sum.hits += stats.hits;
    sum.attack += stats.attack;
    sum.rangedAttack += stats.rangedAttack;
    sum.heal += stats.heal;
    sum.rangedHeal += stats.rangedHeal;
    sum.mitigation += stats.mitigation;
    sum.build += stats.build;
    sum.dismantle += stats.dismantle;
    sum.harvest += stats.harvest;
    sum.score += stats.score;

    return sum;
  }, {
    count: 0,
    hits: 0,
    attack: 0,
    rangedAttack: 0,
    heal: 0,
    rangedHeal: 0,
    mitigation: 0,
    build: 0,
    dismantle: 0,
    harvest: 0,
    score: 0,
  })

  sum.mitigation /= sum.count;
  return sum;
}

export const isAttacker = (creep: Creep) => {
  return combatStats(creep).attack > 0;
}
export const isHealer = (creep: Creep) => {
  return combatStats(creep).heal > 0;
}
export const isRangedAttacker = (creep: Creep) => {
  return combatStats(creep).rangedAttack > 0;
}
export const isHarvester = (creep: Creep) => {
  return combatStats(creep).rangedAttack > 0;
}
