import { Behavior, Sequence } from "BehaviorTree/Behavior";
import { CachedCreep, CachedSource } from "WorldState";

import { Request } from "BehaviorTree/Request";
import { harvestEnergy } from "BehaviorTree/behaviors/harvestEnergy";
import { moveTo } from "BehaviorTree/behaviors/moveTo";

export class DropHarvestRequest extends Request<CachedCreep> {
    public action: Behavior<CachedCreep>;

    constructor(source: CachedSource) {
        super();
        this.action = Sequence(
            moveTo(source.pos),
            harvestEnergy(source)
        )
    }

    // 5 WORK parts will max out a source
    meetsCapacity(creeps: CachedCreep[]) {
        let parts = 0;
        for (let creep of creeps) {
            parts += creep.gameObj.getActiveBodyparts(WORK);
        }
        return (parts >= 5);
    }
    canBeFulfilledBy(creep: CachedCreep) {
        return (
            creep.gameObj.getActiveBodyparts(WORK) > 0 &&
            creep.gameObj.getActiveBodyparts(MOVE) > 0
        )
    }

}
