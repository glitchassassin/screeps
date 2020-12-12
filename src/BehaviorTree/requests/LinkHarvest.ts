import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";

import { CachedSource } from "WorldState/Sources";
import { FranchiseData } from "WorldState/FranchiseData";
import { MinionRequest } from "./MinionRequest";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { dropEnergy } from "BehaviorTree/behaviors/dropEnergy";
import { harvestEnergy } from "BehaviorTree/behaviors/harvestEnergy";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
import profiler from "screeps-profiler";
import { transferEnergy } from "BehaviorTree/behaviors/transferEnergy";

export class LinkHarvestRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;
    public sourceId: Id<Source>;

    constructor(source: CachedSource) {
        super();
        this.pos = source.pos;
        this.sourceId = source.id;
        let franchise = FranchiseData.byId(source.id)
        this.action = Sequence(
            Selector(
                harvestEnergy(source.id),
                moveTo(franchise?.containerPos, 0),
                moveTo(source.pos)
            ),
            Selector(
                transferEnergy(franchise?.linkId),
                dropEnergy(),
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
profiler.registerClass(LinkHarvestRequest, 'LinkHarvestRequest');
