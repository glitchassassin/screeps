import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { moveTo, resetMoveTarget } from "BehaviorTree/behaviors/moveTo";

import { BUILD_PRIORITIES } from "config";
import { MinionRequest } from "./MinionRequest";
import { buildSite } from "BehaviorTree/behaviors/buildSite";
import { createConstructionSite } from "BehaviorTree/behaviors/createConstructionSite";
import { energyEmpty } from "BehaviorTree/behaviors/energyFull";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
import { getEnergyFromSource } from "BehaviorTree/behaviors/getEnergyFromSource";

export class BuildRequest extends MinionRequest {
    public action: Behavior<Creep>;

    constructor(public pos: RoomPosition, public structureType: BuildableStructureConstant) {
        super(BUILD_PRIORITIES[structureType]);
        this.action = Selector(
            Sequence(
                stateIs(States.GET_ENERGY),
                Selector(
                    getEnergy(),
                    getEnergyFromSource()
                ),
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
// profiler.registerClass(BuildRequest, 'BuildRequest');
