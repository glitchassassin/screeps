import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { CachedCreep, CachedStructure } from "WorldState";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";

import { MinionRequest } from "./MinionRequest";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
import { ifRepairIsNotFinished } from "BehaviorTree/behaviors/repairIsNotFinished";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
import profiler from "screeps-profiler";
import { repairStructure } from "BehaviorTree/behaviors/repairStructure";

export class RepairRequest extends MinionRequest {
    public action: Behavior<CachedCreep>;
    public pos: RoomPosition;

    constructor(public structure: CachedStructure, public repairToHits?: number) {
        super();
        this.pos = structure.pos;
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
    canBeFulfilledBy(creep: CachedCreep) {
        return (
            creep.gameObj.getActiveBodyparts(WORK) > 0 &&
            creep.gameObj.getActiveBodyparts(CARRY) > 0 &&
            creep.gameObj.getActiveBodyparts(MOVE) > 0
        )
    }

}
profiler.registerClass(RepairRequest, 'RepairRequest');
