import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { moveTo, resetMoveTarget } from "BehaviorTree/behaviors/moveTo";

import { MinionRequest } from "./MinionRequest";
import { buildSite } from "BehaviorTree/behaviors/buildSite";
import { createConstructionSite } from "BehaviorTree/behaviors/createConstructionSite";
import { energyEmpty } from "BehaviorTree/behaviors/energyFull";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
import profiler from "screeps-profiler";

const BUILD_PRIORITIES: Record<BuildableStructureConstant, number> = {
    [STRUCTURE_CONTAINER]:      5,
    [STRUCTURE_EXTENSION]:      5,
    [STRUCTURE_EXTRACTOR]:      5,
    [STRUCTURE_FACTORY]:        5,
    [STRUCTURE_LAB]:            5,
    [STRUCTURE_LINK]:           5,
    [STRUCTURE_NUKER]:          5,
    [STRUCTURE_OBSERVER]:       5,
    [STRUCTURE_POWER_SPAWN]:    5,
    [STRUCTURE_RAMPART]:        5,
    [STRUCTURE_ROAD]:           2,
    [STRUCTURE_SPAWN]:          5,
    [STRUCTURE_STORAGE]:        5,
    [STRUCTURE_TERMINAL]:       5,
    [STRUCTURE_TOWER]:          5,
    [STRUCTURE_WALL]:           5,
}

export class BuildRequest extends MinionRequest {
    public action: Behavior<Creep>;

    constructor(public pos: RoomPosition, public structureType: BuildableStructureConstant) {
        super(BUILD_PRIORITIES[structureType]);
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
                    Sequence(
                        createConstructionSite(pos, structureType),
                        buildSite(),
                    ),
                    moveTo(pos, 3),
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
profiler.registerClass(BuildRequest, 'BuildRequest');
