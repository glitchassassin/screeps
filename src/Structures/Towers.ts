import { roomPlans } from "Selectors/roomPlans";
import profiler from "utils/profiler";

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

export const runTowers = profiler.registerFN((roomName: string) => {
    const plan = roomPlans(roomName)?.office;
    if (!plan || !Game.rooms[roomName]) return;

    // Count active towers

    // Select the target that will take the most damage
    const targets = Game.rooms[roomName].find(FIND_HOSTILE_CREEPS);
    let priorityTarget: Creep|undefined = undefined;
    let bestDamage = 0;
    for (let target of targets) {
        const damage = plan.headquarters.towers.reduce((sum, t) =>
            sum + towerDamage(t.structure as StructureTower|undefined, target.pos
        ), 0)
        const heal = target.getActiveBodyparts(HEAL) * HEAL_POWER;
        const netDamage = (damage - heal);
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
}, 'runTowers')
