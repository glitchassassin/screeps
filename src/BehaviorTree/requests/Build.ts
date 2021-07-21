import { BUILD_PRIORITIES, PROFILE } from "config";
import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { creepCapacityEmpty, creepCapacityFull } from "BehaviorTree/behaviors/energyFull";
import { moveTo, resetMoveTarget } from "BehaviorTree/behaviors/moveTo";

import { MinionRequest } from "./MinionRequest";
import { buildSite } from "BehaviorTree/behaviors/buildSite";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { createConstructionSite } from "BehaviorTree/behaviors/createConstructionSite";
import { fail } from "BehaviorTree/behaviors/fail";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
import { getEnergyFromSource } from "BehaviorTree/behaviors/getEnergyFromSource";
import profiler from "screeps-profiler";

export class BuildRequest extends MinionRequest {
    public action: Behavior<Creep>;

    constructor(public pos: RoomPosition, public structureType: BuildableStructureConstant) {
        super(BUILD_PRIORITIES[structureType]);
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
                Selector(
                    getEnergy(),
                    getEnergyFromSource()
                ),
                resetMoveTarget(),
                setState(States.WORKING),
                continueIndefinitely()
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

if (PROFILE.requests) profiler.registerClass(BuildRequest, 'BuildRequest');
