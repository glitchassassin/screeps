import { findAcquireTarget, officeShouldSupportAcquireTarget } from "Selectors/findAcquireTarget";

import { MinionTypes } from "Minions/minionTypes";
import { Objective } from "./Objective";
import { resetCreep } from "Selectors/resetCreep";

declare global {
    interface CreepMemory {
        acquireTarget?: Id<StructureController>
    }
}

export class SupportBootstrapObjective extends Objective {
    minionTypes = [MinionTypes.ENGINEER];

    assign(creep: Creep) {
        return (
            officeShouldSupportAcquireTarget(creep.memory.office) &&
            super.assign(creep)
        )
    }

    /**
     * Reassign creep to new room
     */
    action = (creep: Creep) => {
        const room = findAcquireTarget();
        if (!room) return;
        creep.memory.office = room;
        resetCreep(creep);
    }
}

