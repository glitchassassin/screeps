import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { CachedCreep, CachedSource } from "WorldState";

import { MinionRequest } from "./MinionRequest";
import { dropEnergy } from "BehaviorTree/behaviors/dropEnergy";
import { energyNotFull } from "BehaviorTree/behaviors/energyFull";
import { harvestEnergy } from "BehaviorTree/behaviors/harvestEnergy";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
import { transferEnergy } from "BehaviorTree/behaviors/transferEnergy";

export class LinkHarvestRequest extends MinionRequest {
    public action: Behavior<CachedCreep>;
    public pos: RoomPosition;

    constructor(public source: CachedSource) {
        super();
        this.pos = source.pos;
        this.action = Sequence(
            Selector(
                moveTo(source.franchisePos, 0),
                moveTo(source.pos)
            ),
            Selector(
                Sequence(
                    energyNotFull(),
                    harvestEnergy(source)
                ),
                transferEnergy(source.link),
                dropEnergy()
            )

        )
    }

    meetsCapacity(creeps: CachedCreep[]) {
        // Sources have a limited number of spaces to work from
        if (creeps.length >= this.source.maxSalesmen) return true;

        // 5 WORK parts will max out a source
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
