import { States, setState } from "Behaviors/states";
import { debugCPU, resetDebugCPU } from "utils/debugCPU";
import { getFranchisePlanBySourceId, roomPlans } from "Selectors/roomPlans";

import { BehaviorResult } from "Behaviors/Behavior";
import { MinionTypes } from "Minions/minionTypes";
import { Objective } from "./Objective";
import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { franchisesByOffice } from "Selectors/franchisesByOffice";
import { isPositionWalkable } from "Selectors/MapCoordinates";
import { moveTo } from "Behaviors/moveTo";
import { posById } from "Selectors/posById";
import { resetCreep } from "Selectors/resetCreep";
import { resourcesNearPos } from "Selectors/resourcesNearPos";
import { sourceIds } from "Selectors/roomCache";

declare global {
    interface CreepMemory {
        depositSource?: Id<Source>
    }
}

const DEBUG = false;

/**
 * Picks up energy from Sources and transfers it to Storage
 */
export class StorageObjective extends Objective {
    minionTypes = [MinionTypes.ACCOUNTANT];

    private assignedCapacity: Record<string, number> = {}

    debug() {
        console.log(JSON.stringify(this.assignedCapacity));
    }

    resetCapacity() { this.assignedCapacity = {}; }
    updateCapacity(creep: Creep) {
        if (!creep.memory.depositSource) return;
        this.assignedCapacity[creep.memory.depositSource] ??= 0;
        this.assignedCapacity[creep.memory.depositSource] += creep.store.getCapacity(RESOURCE_ENERGY);
    }

    assign(creep: Creep) {
        // If the creep's office has franchises with unassigned capacity, assign minion
        for (let franchise of franchisesByOffice(creep.memory.office)) {
            if (franchiseEnergyAvailable(franchise) > (this.assignedCapacity[franchise] ?? 0)) {
                if (super.assign(creep)) {
                    this.assignedCapacity[franchise] += creep.store.getFreeCapacity(RESOURCE_ENERGY);
                    return true;
                } else {
                    return false;
                }
            }
        }
        return false;
    }

    action = (creep: Creep) => {
        if (DEBUG) resetDebugCPU();
        if (!creep.memory.state) {
            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                setState(States.WITHDRAW)(creep);
            } else {
                setState(States.DEPOSIT)(creep);
            }
        }
        if (DEBUG) debugCPU('Setting initial state');
        if (creep.memory.state === States.WITHDRAW) {
            if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
                setState(States.DEPOSIT)(creep);
            } else {
                if (!creep.memory.depositSource) {
                    // Select a new target: franchise with most surplus
                    let maxSurplus = 0;
                    for (let source of sourceIds(creep.memory.office)) {
                        const surplus = franchiseEnergyAvailable(source);
                        if (surplus > maxSurplus) {
                            maxSurplus = surplus;
                            creep.memory.depositSource = source;
                        }
                    }
                }
                if (DEBUG) debugCPU('Withdraw: Setting deposit source');

                if (creep.memory.depositSource) {
                    const pos = posById(creep.memory.depositSource);
                    if (!pos) return;
                    if (franchiseEnergyAvailable(creep.memory.depositSource) === 0) {
                        creep.memory.depositSource = undefined; // Franchise drained, return to storage
                        setState(States.DEPOSIT)(creep);
                        if (DEBUG) debugCPU('Withdraw: Franchise drained, returning to storage');
                    } else {
                        // First, pick up loose resources
                        const res = resourcesNearPos(pos, 1, RESOURCE_ENERGY).shift();
                        if (DEBUG) debugCPU('Withdraw: Getting resource target');
                        if (res) {
                            if (moveTo(res.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                                creep.pickup(res)
                            }
                            if (DEBUG) debugCPU('Withdraw: Picking up loose resources');
                        } else {
                            // Otherwise, pick up from container
                            const container = getFranchisePlanBySourceId(creep.memory.depositSource)?.container.structure
                            if (!container) return;
                            if (DEBUG) debugCPU('Withdraw: Getting container target');
                            if (moveTo(container.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                                creep.withdraw(container, RESOURCE_ENERGY)
                            }
                            if (DEBUG) debugCPU('Withdraw: Getting from container');
                        }
                    }
                }
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
                if (DEBUG) debugCPU('Deposit: Transferring to storage');
            } else if (isPositionWalkable(storage.pos)) {
                // Drop at storage position
                if (moveTo(storage.pos, 0)(creep) === BehaviorResult.SUCCESS) {
                    creep.drop(RESOURCE_ENERGY);
                    resetCreep(creep); // Free for a new task
                }
                if (DEBUG) debugCPU('Deposit: Dropping at storage');
            } else {
                // Drop next to storage under construction
                if (moveTo(storage.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                    creep.drop(RESOURCE_ENERGY);
                    resetCreep(creep); // Free for a new task
                }
                if (DEBUG) debugCPU('Deposit: Dropping near storage');
            }
        }
    }
}

