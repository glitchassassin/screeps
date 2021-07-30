import { States, setState } from "Behaviors/states";
import { spawnsAndExtensions, spawnsAndExtensionsDemand } from "Selectors/spawnsAndExtensionsDemand";

import { BehaviorResult } from "Behaviors/Behavior";
import { MinionTypes } from "Minions/minionTypes";
import { Objective } from "./Objective";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { resetCreep } from "Selectors/resetCreep";

declare global {
    interface CreepMemory {
        refillTarget?: string
    }
}

/**
 * Picks up energy from Sources and transfers it to Storage
 */
export class RefillExtensionsObjective extends Objective {
    minionTypes = [MinionTypes.ACCOUNTANT];

    private assignedCapacity: Record<string, number> = {}

    debug() {
        console.log(JSON.stringify(this.assignedCapacity));
    }

    resetCapacity() { this.assignedCapacity = {}; }
    updateCapacity(creep: Creep) {
        this.assignedCapacity[creep.memory.office] ??= 0;
        this.assignedCapacity[creep.memory.office] += creep.store.getCapacity(RESOURCE_ENERGY);
    }

    assign(creep: Creep) {
        // If the creep's office has franchises with unassigned capacity, assign minion
        const demand = spawnsAndExtensionsDemand(creep.memory.office)
        if (demand > (this.assignedCapacity[creep.memory.office] ?? 0)) {
            if (super.assign(creep)) {
                this.assignedCapacity[creep.memory.office] += creep.store.getFreeCapacity(RESOURCE_ENERGY);
                return true;
            } else {
                return false;
            }
        }
        return false;
    }

    action = (creep: Creep) => {
        if (!creep.memory.state || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            setState(States.WITHDRAW)(creep);
        } else if (!creep.memory.state) {
            setState(States.DEPOSIT)(creep);
        }

        if (creep.memory.state === States.WITHDRAW) {
            const result = getEnergyFromStorage(creep);
            if (result === BehaviorResult.SUCCESS) {
                setState(States.DEPOSIT)(creep);
            } else if (result === BehaviorResult.FAILURE) {
                resetCreep(creep);
                return;
            }
        }
        if (creep.memory.state === States.DEPOSIT) {
            if (!creep.memory.refillTarget) {
                for (let s of spawnsAndExtensions(creep.memory.office)) {
                    if (((s.structure as StructureExtension)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0) > 0) {
                        creep.memory.refillTarget = s.serialize();
                        break;
                    }
                }
            }
            if (!creep.memory.refillTarget) {
                // No targets found. Free for another Objective
                resetCreep(creep)
                return
            }

            const target = PlannedStructure.deserialize(creep.memory.refillTarget);
            if (!target.structure || (target.structure as StructureExtension).store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                // Re-target
                creep.memory.refillTarget = undefined;
                return;
            }

            if (moveTo(target.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                creep.transfer(target.structure, RESOURCE_ENERGY);
                creep.memory.refillTarget = undefined;
                return;
            }
        }
    }
}

