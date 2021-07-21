import { BUILD_PRIORITIES, PROFILE } from "config";
import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { creepCapacityEmpty, creepCapacityFull } from "BehaviorTree/behaviors/energyFull";
import { moveTo, resetMoveTarget } from "BehaviorTree/behaviors/moveTo";

import { CachedStructure } from "WorldState/Structures";
import { MinionRequest } from "./MinionRequest";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { fail } from "BehaviorTree/behaviors/fail";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
import profiler from "screeps-profiler";
import { repairStructure } from "BehaviorTree/behaviors/repairStructure";

export class RepairRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;
    public structureId: Id<Structure>

    constructor(structure: CachedStructure, public repairToHits?: number) {
        super(BUILD_PRIORITIES[structure.structureType as BuildableStructureConstant] + 1);
        this.pos = structure.pos;
        this.structureId = structure.id;
        this.action = Selector(
            Sequence(
                Selector(
                    stateIsEmpty(),
                    creepCapacityEmpty()
                ),
                setState(States.GET_ENERGY),
                fail(), // Skip to next step
            ),
            Sequence(
                Selector(
                    creepCapacityFull()
                ),
                setState(States.WORKING),
                fail(), // Skip to next step
            ),
            Sequence(
                stateIs(States.GET_ENERGY),
                getEnergy(),
                resetMoveTarget(),
                setState(States.WORKING),
                continueIndefinitely()
            ),
            Sequence(
                stateIs(States.WORKING),
                Selector(
                    repairStructure(structure, repairToHits),
                    moveTo(structure.pos, 3),
                ),
            ),
        )
        if (PROFILE.requests) this.action = profiler.registerFN(this.action, `${this.constructor.name}.action`) as Behavior<Creep>
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

if (PROFILE.requests) profiler.registerClass(RepairRequest, 'RepairRequest');
