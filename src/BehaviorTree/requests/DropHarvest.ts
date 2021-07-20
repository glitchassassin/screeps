import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { CachedFranchise, FranchiseData } from "WorldState/FranchiseData";

import { MinionRequest } from "./MinionRequest";
import { PROFILE } from "config";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { harvestEnergy } from "BehaviorTree/behaviors/harvestEnergy";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
import profiler from "screeps-profiler";

export class DropHarvestRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;
    public targetId: Id<Source>;

    constructor(franchise: CachedFranchise) {
        super();
        this.pos = franchise.pos;
        this.targetId = franchise.id;
        this.action = Sequence(
            Selector(
                moveTo(franchise.containerPos, 0),
                moveTo(franchise.pos),
            ),
            harvestEnergy(franchise.id),
            continueIndefinitely()
        )
        if (PROFILE.requests) this.action = profiler.registerFN(this.action, `${this.constructor.name}.action`) as Behavior<Creep>
    }

    meetsCapacity(creeps: Creep[]) {
        // Sources have a limited number of spaces to work from
        if (creeps.length >= (FranchiseData.byId(this.targetId)?.maxSalesmen ?? 0)) return true;

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

if (PROFILE.requests) profiler.registerClass(DropHarvestRequest, 'DropHarvestRequest');
