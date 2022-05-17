import { Objectives } from "Objectives/Objective";
import { byId } from "Selectors/byId";
import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";

export function getBoosted(creep: Creep) {
    // If no Scientists are on duty, skip
    if (!Objectives['ScienceObjective'].assigned.length) return BehaviorResult.FAILURE;

    // Check if boosts are completed
    const boosts = creep.body.reduce((map, part) => {
        if (part.boost) map.set(part.boost as MineralBoostConstant, (map.get(part.boost as MineralBoostConstant) ?? 0) + 1);
        return map;
    }, new Map<MineralBoostConstant, number>())
    const outstanding = Memory.offices[creep.memory.office].lab.boosts.find(o => o.id === creep.id)?.boosts.filter(b => !boosts.has(b.type)) ?? [];
    // We don't need to check count, only completeness
    if (outstanding.length === 0) {
        // All boosts accounted for, we're done
        Memory.offices[creep.memory.office].lab.boosts = Memory.offices[creep.memory.office].lab.boosts.filter(o => o.id !== creep.id)
        return BehaviorResult.SUCCESS;
    }

    // We still have some boosts outstanding
    const targetLab = Memory.offices[creep.memory.office].lab.boostingLabs.find(l => outstanding.some(o => o.type === l.resource));
    const lab = byId(targetLab?.id)
    if (lab && moveTo(lab.pos)(creep) === BehaviorResult.SUCCESS) {
        if (lab.boostCreep(creep) === OK && creep.memory.objective) {
            const boostCount = Math.round((outstanding.find(b => b.type === targetLab?.resource)?.count ?? 0) * 2/3)
            Objectives[creep.memory.objective].recordEnergyUsed(creep.memory.office, boostCount)
        }
    }
    return BehaviorResult.INPROGRESS;
}
