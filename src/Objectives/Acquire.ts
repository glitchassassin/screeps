import { BehaviorResult } from "Behaviors/Behavior";
import { MinionTypes } from "Minions/minionTypes";
import { Objective } from "./Objective";
import { byId } from "Selectors/byId";
import { findAcquireTarget } from "Selectors/findAcquireTarget";
import { moveTo } from "Behaviors/moveTo";
import { posById } from "Selectors/posById";

declare global {
    interface CreepMemory {
        acquireTarget?: Id<StructureController>
    }
}

export class AcquireObjective extends Objective {
    minionTypes = [MinionTypes.LAWYER];

    action = (creep: Creep) => {
        if (!creep.memory.acquireTarget) {
            const room = findAcquireTarget();
            if (!room) return;
            creep.memory.acquireTarget = Memory.rooms[room].controllerId;
        }

        const pos = posById(creep.memory.acquireTarget)
        if (!pos) return;

        if (moveTo(pos, 1)(creep) === BehaviorResult.SUCCESS) {
            const controller = byId(creep.memory.acquireTarget)
            if (!controller) return;
            creep.signController(controller, 'This sector property of the Grey Company');
            creep.claimController(controller);
        }
    }
}

