import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { CachedFranchise, FranchiseData } from "WorldState/FranchiseData";

import { MinionRequest } from "./MinionRequest";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { harvestEnergy } from "BehaviorTree/behaviors/harvestEnergy";
import { moveTo } from "BehaviorTree/behaviors/moveTo";

export class DropHarvestRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;
    public sourceId: Id<Source>;

    constructor(franchise: CachedFranchise) {
        super();
        this.pos = franchise.pos;
        this.sourceId = franchise.id;
        this.action = Sequence(
            Selector(
                moveTo(franchise.containerPos, 0),
                harvestEnergy(franchise.id),
                moveTo(franchise.pos),
            ),
            continueIndefinitely()
        )
    }

    meetsCapacity(creeps: Creep[]) {
        // Sources have a limited number of spaces to work from
        if (creeps.length >= (FranchiseData.byId(this.sourceId)?.maxSalesmen ?? 0)) return true;

        // 5 WORK parts will max out a source
        let parts = 0;
        for (let creep of creeps) {
            parts += creep.getActiveBodyparts(WORK);
        }
        return (parts >= 5);
    }
    canBeFulfilledBy(creep: Creep) {
        return (
            creep.getActiveBodyparts(WORK) > 0 &&
            creep.getActiveBodyparts(MOVE) > 0
        )
    }

}

// profiler.registerClass(DropHarvestRequest, 'DropHarvestRequest');
