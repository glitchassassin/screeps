import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { CachedMine, MineData } from "WorldState/MineData";

import { MinionRequest } from "./MinionRequest";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { harvestEnergy } from "BehaviorTree/behaviors/harvestEnergy";
import { moveTo } from "BehaviorTree/behaviors/moveTo";

export class DropMineRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;
    public targetId: Id<Mineral>;

    constructor(mine: CachedMine) {
        super();
        this.pos = mine.pos;
        this.targetId = mine.id;
        this.action = Sequence(
            Selector(
                moveTo(mine.containerPos, 0),
                harvestEnergy(mine.id),
                moveTo(mine.pos),
            ),
            continueIndefinitely()
        )
    }

    meetsCapacity(creeps: Creep[]) {
        // Sources have a limited number of spaces to work from
        return (creeps.length >= (MineData.byId(this.targetId)?.maxForemen ?? 0))
    }
    canBeFulfilledBy(creep: Creep) {
        return (
            creep.getActiveBodyparts(WORK) > 0 &&
            creep.getActiveBodyparts(MOVE) > 0
        )
    }

}

// profiler.registerClass(DropHarvestRequest, 'DropHarvestRequest');
