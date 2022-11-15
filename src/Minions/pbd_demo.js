const healPower = 12 * 4;
const damageReduction = 0.7;
const attackPower = 30 * 4;
const speed = 4 / 5;

const maxParts = Math.floor(100 * speed);
const maxToughAttack = Math.floor(50 * speed);

let dmg = body => {
  const totalDamage = body.filter(p => p === 'ATTACK').length * attackPower;
  const totalHealing = body.filter(p => p === 'HEAL').length * healPower;
  let damageRemaining = totalDamage / 2;
  let damageDealt = 0;
  for (const part of body) {
    if (damageRemaining === 0) break;
    let hits = 100;
    if (part === 'TOUGH') {
      hits = 100 / (1 - damageReduction);
      damageDealt += Math.min(damageRemaining, hits) * (1 - damageReduction);
    } else {
      damageDealt += Math.min(damageRemaining, hits);
    }
    damageRemaining -= Math.min(damageRemaining, hits);
    // console.log(part, hits, damageDealt, totalDamage);
  }
  // console.log(totalDamage, damageDealt);
  const netDamage = damageDealt - totalHealing;
  // if (netDamage < 0) console.log(totalDamage, damageDealt, totalHealing, netDamage < 0);
  return { damage: totalDamage, valid: netDamage <= 0 };
};

// dmg(['TOUGH', 'ATTACK', 'HEAL']);
// dmg(['ATTACK', 'HEAL']);

let best = [];
let bestDamage = 0;
let bestCost = Infinity;

for (let attack = 0; attack < maxParts; attack++) {
  for (let tough = 0; tough < maxParts; tough++) {
    if (tough + attack > maxToughAttack) {
      break; // not enough move parts on attacker, keep going
    }
    for (let heal = 0; heal < maxParts; heal++) {
      if (attack + heal + tough > maxParts) {
        break; // body too large, keep going
      }
      // console.log(`${tough ?? 0}T/${attack ?? 0}A/${heal ?? 0}H`);
      const { damage, valid } = dmg(
        [].concat(Array(tough).fill('TOUGH'), Array(attack).fill('ATTACK'), Array(heal).fill('HEAL'))
      );
      if (!valid) continue;
      let cost = attack * 80 + tough * 10 + heal * 250;
      if (damage > bestDamage || (damage === bestDamage && cost < bestCost)) {
        best = [tough, attack, heal];
        bestDamage = damage;
        bestCost = cost;
      }
    }
  }
}

const [tough, attack, heal] = best;
console.log(
  `${tough ?? 0}T/${attack ?? 0}A/${heal ?? 0}H: ${bestDamage} dmg (${Math.round(
    bestDamage - tough * (100 / (1 - damageReduction) - 100)
  )} mitigated) / ${heal * healPower} healing for ${bestCost} energy. Time to crack: ${
    2000000 / (attack * attackPower)
  }. Move parts: ${Math.ceil((tough + attack + heal) / speed - (tough + attack + heal))}`
);
