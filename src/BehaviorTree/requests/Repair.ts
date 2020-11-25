import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";

import { CachedStructure } from "WorldState/Structures";
import { MinionRequest } from "./MinionRequest";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
import { ifRepairIsNotFinished } from "BehaviorTree/behaviors/repairIsNotFinished";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
import profiler from "screeps-profiler";
import { repairStructure } from "BehaviorTree/behaviors/repairStructure";

export class RepairRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;
    public structureId: Id<Structure>

    constructor(structure: CachedStructure, public repairToHits?: number) {
        super();
        this.pos = structure.pos;
        this.structureId = structure.id;
        this.action = Selector(
            Sequence(
                stateIsEmpty(),
                setState(States.GET_ENERGY)
            ),
            Sequence(
                stateIs(States.GET_ENERGY),
                getEnergy(),
                setState(States.WORKING)
            ),
            Sequence(
                stateIs(States.WORKING),
                moveTo(structure.pos, 3),
                repairStructure(structure, repairToHits)
            ),
            Sequence(
                ifRepairIsNotFinished(),
                setState(States.GET_ENERGY)
            )
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
profiler.registerClass(RepairRequest, 'RepairRequest');
