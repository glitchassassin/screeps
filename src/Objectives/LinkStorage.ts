import { States, setState } from "Behaviors/states";

import { BehaviorResult } from "Behaviors/Behavior";
import { MinionTypes } from "Minions/minionTypes";
import { Objective } from "./Objective";
import { getEnergyFromLink } from "Behaviors/getEnergyFromLink";
import { isPositionWalkable } from "Selectors/MapCoordinates";
import { moveTo } from "Behaviors/moveTo";
import { resetCreep } from "Selectors/resetCreep";
import { roomPlans } from "Selectors/roomPlans";

declare global {
    interface CreepMemory {
        depositSource?: Id<Source>
    }
}

/**
 * Picks up energy from Sources and transfers it to Storage
 */
export class LinkStorageObjective extends Objective {
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
        const link = roomPlans(creep.memory.office)?.office.headquarters.link.structure as StructureLink|undefined
        const demand = link?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0
        if (demand > (this.assignedCapacity[creep.memory.office] ?? 0) && super.assign(creep)) {
            return true;
        }
        return false;
    }

    action = (creep: Creep) => {
        if (!creep.memory.state) {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                setState(States.WITHDRAW)(creep);
            } else {
                setState(States.DEPOSIT)(creep);
            }
        }
        if (creep.memory.state === States.WITHDRAW) {
            const result = getEnergyFromLink(creep)
            if (result === BehaviorResult.SUCCESS) {
                setState(States.DEPOSIT)(creep);
            } else if (result === BehaviorResult.FAILURE) {
                resetCreep(creep); // Free for a new task
            }
        }
        if (creep.memory.state === States.DEPOSIT) {
            const storage = roomPlans(creep.memory.office)?.office.headquarters.storage;
            if (!storage) return;
            if (storage.structure) {
                moveTo(storage.pos, 1)(creep);
                if (creep.transfer(storage.structure, RESOURCE_ENERGY) === OK) {
                    resetCreep(creep); // Free for a new task
                }
            } else if (isPositionWalkable(storage.pos)) {
                // Drop at storage position
                if (moveTo(storage.pos, 0)(creep) === BehaviorResult.SUCCESS) {
                    creep.drop(RESOURCE_ENERGY);
                    resetCreep(creep); // Free for a new task
                }
            } else {
                // Drop next to storage under construction
                if (moveTo(storage.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                    creep.drop(RESOURCE_ENERGY);
                    resetCreep(creep); // Free for a new task
                }
            }
        }
    }
}

