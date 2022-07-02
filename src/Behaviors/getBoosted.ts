import { FEATURES } from "config";
import { Objectives } from "OldObjectives/Objective";
import { byId } from "Selectors/byId";
import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";

export function getBoosted(creep: Creep) {
    // If no Scientists are on duty, skip
    if (!FEATURES.LABS || !Objectives['ScienceObjective'].assigned.length) return BehaviorResult.FAILURE;

    // Check if boosts are completed
    const boosts = creep.body.reduce((map, part) => {
        if (part.boost) map.set(part.boost as MineralBoostConstant, (map.get(part.boost as MineralBoostConstant) ?? 0) + 30);
        return map;
    }, new Map<MineralBoostConstant, number>())
    const outstanding = Memory.offices[creep.memory.office].lab.boosts
        .find(o => o.name === creep.name)?.boosts
        .filter(b => (boosts.get(b.type) ?? 0) < b.count) ?? [];
    // We don't need to check count, only completeness
    if (outstanding.length === 0) {
        // All boosts accounted for, we're done
        Memory.offices[creep.memory.office].lab.boosts = Memory.offices[creep.memory.office].lab.boosts.filter(o => o.name !== creep.name)
        // console.log(creep.memory.office, 'Boosted creep', JSON.stringify(creep.body));
        return BehaviorResult.SUCCESS;
    }

    // console.log(creep.memory.office, creep.name, JSON.stringify([...boosts.values()]))

    // We still have some boosts outstanding
    const targetLab = Memory.offices[creep.memory.office].lab.boostingLabs.find(l => outstanding.some(o => o.type === l.resource));
    const lab = byId(targetLab?.id)
    const targetBoostCount = (outstanding.find(b => b.type === targetLab?.resource)?.count ?? 0)
    if (lab && moveTo(creep, { pos: lab.pos, range: 1 }) === BehaviorResult.SUCCESS && lab.mineralType && lab.store.getUsedCapacity(lab.mineralType) >= targetBoostCount) {
        const result = lab.boostCreep(creep);
        if (result === OK && creep.memory.objective) {
            const boostCost = Math.round(targetBoostCount * 2/3)
            Objectives[creep.memory.objective].recordEnergyUsed(creep.memory.office, boostCost)
        }
    }
    return BehaviorResult.INPROGRESS;
}
