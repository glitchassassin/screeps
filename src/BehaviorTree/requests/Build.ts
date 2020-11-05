import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, stateIs } from "BehaviorTree/behaviors/states";

import { CachedCreep } from "WorldState";
import { Request } from "BehaviorTree/Request";
import { buildSite } from "BehaviorTree/behaviors/buildSite";
import { createConstructionSite } from "BehaviorTree/behaviors/createConstructionSite";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
import { moveTo } from "BehaviorTree/behaviors/moveTo";

export class BuildRequest extends Request<CachedCreep> {
    public action: Behavior<CachedCreep>;

    constructor(pos: RoomPosition, structureType: BuildableStructureConstant) {
        super();
        this.action = Selector(
            Sequence(
                stateIs(States.GET_ENERGY),
                getEnergy(),
            ),
            Sequence(
                stateIs(States.WORKING),
                moveTo(pos, 3),
                createConstructionSite(pos, structureType),
                buildSite()
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
