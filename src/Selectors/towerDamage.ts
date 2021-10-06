/**
 * Based on https://github.com/screeps/engine/blob/master/src/processor/intents/towers/attack.js#L32
 */
 export const towerDamage = (tower?: StructureTower, pos?: RoomPosition) => {
    if (!tower || !pos) return 0;
    const range = Math.min(TOWER_FALLOFF_RANGE, tower.pos.getRangeTo(pos));
    let amount = TOWER_POWER_ATTACK;
    if(range > TOWER_OPTIMAL_RANGE) {
        amount -= amount * TOWER_FALLOFF * (range - TOWER_OPTIMAL_RANGE) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
    }
    return amount;
}
