import { Behavior, Selector } from "BehaviorTree/Behavior";

import { CachedStructure } from "WorldState/Structures";
import { MinionRequest } from "./MinionRequest";
import { dismantleStructure } from "BehaviorTree/behaviors/dismantleStructure";
import { moveTo } from "BehaviorTree/behaviors/moveTo";

export class DismantleRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition

    constructor(public structure: CachedStructure) {
        super(7);
        this.pos = structure.pos;
        this.action = Selector(
            dismantleStructure(structure),
            moveTo(structure.pos),
        )
    }

    // Assign any available minions to each build request
    meetsCapacity() { return false; }
    canBeFulfilledBy(creep: Creep) {
        return (
            creep.getActiveBodyparts(WORK) > 0 &&
            creep.getActiveBodyparts(CARRY) > 0 &&
            creep.getActiveBodyparts(MOVE) > 0
        )
    }

}
// profiler.registerClass(BuildRequest, 'BuildRequest');
