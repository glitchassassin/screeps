import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { moveTo, resetMoveTarget } from "BehaviorTree/behaviors/moveTo";

import { BUILD_PRIORITIES } from "config";
import { CachedStructure } from "WorldState/Structures";
import { MinionRequest } from "./MinionRequest";
import { energyEmpty } from "BehaviorTree/behaviors/energyFull";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
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
                stateIs(States.GET_ENERGY),
                getEnergy(),
                setState(States.WORKING),
                resetMoveTarget()
            ),
            Sequence(
                stateIs(States.WORKING),
                Selector(
                    repairStructure(structure, repairToHits),
                    moveTo(structure.pos, 3),
                )
            ),
            Sequence(
                Selector(
                    stateIsEmpty(),
                    energyEmpty()
                ),
                setState(States.GET_ENERGY)
            ),
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
// profiler.registerClass(RepairRequest, 'RepairRequest');
