import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { CachedCreep, CachedStructure } from "WorldState";
import { States, stateIs } from "BehaviorTree/behaviors/states";

import { Request } from "BehaviorTree/Request";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
import { repairStructure } from "BehaviorTree/behaviors/repairStructure";

export class BuildRequest extends Request<CachedCreep> {
    public action: Behavior<CachedCreep>;

    constructor(structure: CachedStructure) {
        super();
        this.action = Selector(
            Sequence(
                stateIs(States.GET_ENERGY),
                getEnergy(),
            ),
            Sequence(
                stateIs(States.WORKING),
                moveTo(structure.pos, 3),
                repairStructure(structure)
            )
        )
    }

    // Assign any available minions to each build request
    meetsCapacity() { return false; }
    canBeFulfilledBy(creep: CachedCreep) {
        return (
            creep.gameObj.getActiveBodyparts(WORK) > 0 &&
            creep.gameObj.getActiveBodyparts(CARRY) > 0 &&
            creep.gameObj.getActiveBodyparts(MOVE) > 0
        )
    }

}
