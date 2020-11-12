import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";

import { CachedCreep } from "WorldState";
import { MinionRequest } from "./MinionRequest";
import { buildSite } from "BehaviorTree/behaviors/buildSite";
import { createConstructionSite } from "BehaviorTree/behaviors/createConstructionSite";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
import { ifBuildIsNotFinished } from "BehaviorTree/behaviors/buildIsNotFinished";
import { moveTo } from "BehaviorTree/behaviors/moveTo";
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
    public action: Behavior<CachedCreep>;

    constructor(public pos: RoomPosition, structureType: BuildableStructureConstant) {
        super(BUILD_PRIORITIES[structureType]);
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
                moveTo(pos, 3),
                createConstructionSite(pos, structureType),
                buildSite()
            ),
            Sequence(
                ifBuildIsNotFinished(),
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
profiler.registerClass(BuildRequest, 'BuildRequest');
