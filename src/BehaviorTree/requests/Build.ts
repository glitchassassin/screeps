import { BARRIER_LEVEL, BUILD_PRIORITIES, PROFILE } from "config";
import { Behavior, Selector, Sequence } from "BehaviorTree/Behavior";
import { States, setState, stateIs, stateIsEmpty } from "BehaviorTree/behaviors/states";
import { creepCapacityEmpty, creepCapacityFull } from "BehaviorTree/behaviors/energyFull";
import { moveTo, resetMoveTarget } from "BehaviorTree/behaviors/moveTo";

import { Health } from "WorldState/Health";
import { MemoizeByTick } from "utils/memoize";
import { MinionRequest } from "./MinionRequest";
import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";
import { buildSite } from "BehaviorTree/behaviors/buildSite";
import { continueIndefinitely } from "BehaviorTree/behaviors/continueIndefinitely";
import { createConstructionSite } from "BehaviorTree/behaviors/createConstructionSite";
import { fail } from "BehaviorTree/behaviors/fail";
import { getEnergy } from "BehaviorTree/behaviors/getEnergy";
import { getEnergyFromSource } from "BehaviorTree/behaviors/getEnergyFromSource";
import { getRcl } from "utils/gameObjectSelectors";
import profiler from "screeps-profiler";
import { repairStructure } from "BehaviorTree/behaviors/repairStructure";

export class BuildRequest extends MinionRequest {
    public action: Behavior<Creep>;
    public pos: RoomPosition;
    public repairToHits?: number;

    constructor(public structure: PlannedStructure) {
        super(BUILD_PRIORITIES[structure.structureType]);
        this.pos = structure.pos;
        this.repairToHits =
            (structure.structureType === STRUCTURE_RAMPART || structure.structureType === STRUCTURE_WALL) ?
            BARRIER_LEVEL[getRcl(this.pos.roomName) ?? 0] :
            undefined;
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
                        createConstructionSite(structure),
                        buildSite(),
                        repairStructure(structure, this.repairToHits),
                    ),
                    moveTo(structure.pos, 3),
                    continueIndefinitely()
                )
            ),
        )
        if (PROFILE.requests) this.action = profiler.registerFN(this.action, `${this.constructor.name}.action`) as Behavior<Creep>
    }

    // Assign any available minions to each build request until complete
    @MemoizeByTick(true)
    meetsCapacity() {
        let health = Health.byId(this.structure.structureId)
        if (!health) return false;
        let hits = health.hits
        let hitsMax = this.repairToHits ?? health.hitsMax
        return hits >= hitsMax; // If complete, assign no more minions
    }
    canBeFulfilledBy(creep: Creep) {
        return (
            creep.getActiveBodyparts(WORK) > 0 &&
            creep.getActiveBodyparts(CARRY) > 0 &&
            creep.getActiveBodyparts(MOVE) > 0
        )
    }

}

if (PROFILE.requests) profiler.registerClass(BuildRequest, 'BuildRequest');
