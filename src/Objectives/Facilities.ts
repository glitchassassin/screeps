import { BARRIER_LEVEL, BARRIER_TYPES } from "config";
import { States, setState } from "Behaviors/states";
import { destroyAdjacentUnplannedStructures, facilitiesWorkToDo } from "Selectors/facilitiesWorkToDo";

import { BehaviorResult } from "Behaviors/Behavior";
import { MinionTypes } from "Minions/minionTypes";
import { Objective } from "./Objective";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { resetCreep } from "Selectors/resetCreep";

declare global {
    interface CreepMemory {
        facilitiesTarget?: string;
    }
}

export class FacilitiesObjective extends Objective {
    minionTypes = [MinionTypes.ENGINEER];

    assign(creep: Creep) {
        return (facilitiesWorkToDo(creep.memory.office).length > 0 && super.assign(creep))
    }

    action = (creep: Creep) => {
        // Check target for completion
        if (creep.memory.facilitiesTarget) {
            const plan = PlannedStructure.deserialize(creep.memory.facilitiesTarget)
            if (plan.structure) {
                const rcl = Game.rooms[creep.memory.office].controller?.level ?? 0;
                const maxHits = BARRIER_TYPES.includes(plan.structureType) ? BARRIER_LEVEL[rcl] : plan.structure.hitsMax;
                if (plan.structure.hits >= maxHits) {
                    creep.memory.facilitiesTarget = undefined;
                }
            }
        }

        // Select a target
        if (!creep.memory.facilitiesTarget) {
            let target = facilitiesWorkToDo(creep.memory.office).shift();
            if (target) {
                creep.memory.facilitiesTarget = target.serialize();
                destroyAdjacentUnplannedStructures(creep.memory.office, target);
            }
        }

        if (!creep.memory.facilitiesTarget) {
            resetCreep(creep); // Free for other tasks
            return;
        }

        // Do work
        if (!creep.memory.state || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            setState(States.GET_ENERGY)(creep);
        }
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            setState(States.WORKING)(creep);
        }
        if (creep.memory.state === States.GET_ENERGY) {
            if (getEnergyFromStorage(creep) === BehaviorResult.SUCCESS) {
                setState(States.WORKING);
            }
        }
        if (creep.memory.state === States.WORKING) {
            const plan = PlannedStructure.deserialize(creep.memory.facilitiesTarget)

            if (moveTo(plan.pos, 3)(creep) === BehaviorResult.SUCCESS) {
                if (plan.structure) {
                    creep.repair(plan.structure);
                } else {
                    // Create construction site if needed
                    plan.pos.createConstructionSite(plan.structureType)
                    // Shove creeps out of the way if needed
                    plan.pos.lookFor(LOOK_CREEPS)[0]?.giveWay();
                    if (plan.constructionSite) {
                        creep.build(plan.constructionSite)
                    }
                }
            }
        }
    }
}

