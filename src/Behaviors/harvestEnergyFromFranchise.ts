import { BehaviorResult } from "./Behavior";
import { byId } from "Selectors/byId";
import { findFranchiseTarget } from "Selectors/findFranchiseTarget";
import { getFranchisePlanBySourceId } from "Selectors/roomPlans";
import { moveTo } from "./moveTo";
import { posById } from "Selectors/posById";

declare global {
    interface CreepMemory {
        franchiseTarget?: Id<Source>
    }
}

export const harvestEnergyFromFranchise = (creep: Creep, franchiseTarget?: Id<Source>) => {
    creep.memory.franchiseTarget ??= franchiseTarget;

    if (!creep.memory.franchiseTarget) {
        // Look for an available target
        creep.memory.franchiseTarget = findFranchiseTarget(creep);
    }

    if (!creep.memory.franchiseTarget) {
        return BehaviorResult.FAILURE;
    }
    const plan = getFranchisePlanBySourceId(creep.memory.franchiseTarget)
    const source = byId(creep.memory.franchiseTarget);
    const sourcePos = source?.pos ?? posById(creep.memory.franchiseTarget);

    if (
        !sourcePos ||
        (Game.rooms[sourcePos.roomName] && !source)
    ) {
        return BehaviorResult.FAILURE
    }

    // Prefer to work from container position, fall back to adjacent position
    if (
        plan &&
        !creep.pos.isEqualTo(plan.container.pos) &&
        plan.container.pos.lookFor(LOOK_CREEPS).length === 0
    ) {
        moveTo(plan.container.pos, 0)(creep);
    } else if (!creep.pos.isNearTo(sourcePos!)) {
        moveTo(sourcePos, 1)(creep);
    }

    creep.harvest(source!)

    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        return BehaviorResult.SUCCESS;
    } else {
        return BehaviorResult.INPROGRESS;
    }
}
