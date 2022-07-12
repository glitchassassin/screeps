import { byId } from "Selectors/byId";
import { posById } from "Selectors/posById";
import { getFranchisePlanBySourceId } from "Selectors/roomPlans";
import profiler from "utils/profiler";
import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";

export const harvestEnergyFromFranchise = profiler.registerFN((creep: Creep, franchiseTarget: Id<Source>) => {
    const source = byId(franchiseTarget);
    const sourcePos = source?.pos ?? posById(franchiseTarget);
    const plan = getFranchisePlanBySourceId(franchiseTarget);

    if (
        !sourcePos ||
        (Game.rooms[sourcePos.roomName] && !source)
    ) {
        return BehaviorResult.FAILURE
    }

    // Prefer to work from container position, fall back to adjacent position
    let result = BehaviorResult.SUCCESS;
    if (
        plan &&
        !creep.pos.isEqualTo(plan.container.pos) &&
        (!Game.rooms[plan.container.pos.roomName] || plan.container.pos.lookFor(LOOK_CREEPS).length === 0) &&
        !plan.link.structure
    ) {
        result = moveTo(creep, [{pos: plan.container.pos, range: 0}]);
    } else if (!creep.pos.isNearTo(sourcePos!)) {
        result = moveTo(creep, [{ pos: sourcePos, range: 1}]);
    }

    creep.harvest(source!)

    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        return BehaviorResult.SUCCESS;
    } else {
        return BehaviorResult.INPROGRESS;
    }
}, 'harvestEnergyFromFranchise');
