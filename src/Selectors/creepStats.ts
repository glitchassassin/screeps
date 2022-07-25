export const creepStats = (creeps: Creep[]) => {
  return creeps.reduce((sum, creep) => {
      sum.count += 1;
      creep.body.forEach(p => {
          sum.hits += p.hits;
          if (p.hits) {
              if (p.type === HEAL) {
                  let heal = HEAL_POWER;
                  if (p.boost) {
                      heal *= BOOSTS[HEAL][p.boost].heal;
                  }
                  sum.heal += heal;
              } else if (p.type === ATTACK) {
                  let attack = ATTACK_POWER;
                  if (p.boost) {
                      attack *= BOOSTS[ATTACK][p.boost].attack;
                  }
                  sum.attack += attack;
              } else if (p.type === RANGED_ATTACK) {
                  let rangedAttack = ATTACK_POWER;
                  if (p.boost) {
                      rangedAttack *= BOOSTS[RANGED_ATTACK][p.boost].rangedAttack;
                  }
                  sum.rangedAttack += rangedAttack;
              }
          }
      })
      return sum;
  }, { count: 0, hits: 0, heal: 0, attack: 0, rangedAttack: 0 })
}
