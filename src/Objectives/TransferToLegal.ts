import { States, setState } from "Behaviors/states";

import { BehaviorResult } from "Behaviors/Behavior";
import { MinionTypes } from "Minions/minionTypes";
import { Objective } from "./Objective";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { resetCreep } from "Selectors/resetCreep";
import { resourcesNearPos } from "Selectors/resourcesNearPos";
import { roomPlans } from "Selectors/roomPlans";

/**
 * Picks up energy from Sources and transfers it to Storage
 */
export class TransferToLegalObjective extends Objective {
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
        const plan = roomPlans(creep.memory.office)?.office;
        if (!plan) return false;

        // If the creep's office has franchises with unassigned capacity, assign minion
        const demand = Math.min(
            (plan.headquarters.storage.structure as StructureStorage)?.store.getUsedCapacity(RESOURCE_ENERGY) ??
            resourcesNearPos(plan.headquarters.storage.pos, 1).reduce((sum, r) => sum + r.amount, 0),
            (plan.headquarters.container.structure as StructureContainer)?.store.getFreeCapacity(RESOURCE_ENERGY),
        )
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

        const plan = roomPlans(creep.memory.office)?.office
        if (!plan) return;

        if (creep.memory.state === States.WITHDRAW) {
            const result = getEnergyFromStorage(creep);
            if (result === BehaviorResult.SUCCESS) {
                setState(States.DEPOSIT)(creep);
            } else if (result === BehaviorResult.FAILURE) {
                resetCreep(creep);
            }
        }
        if (creep.memory.state === States.DEPOSIT) {
            if (plan.headquarters.container.structure) {
                if (moveTo(plan.headquarters.container.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                    creep.transfer(plan.headquarters.container.structure, RESOURCE_ENERGY);
                    resetCreep(creep);
                }
            } else {
                if (moveTo(plan.headquarters.container.pos, 0)(creep) === BehaviorResult.SUCCESS) {
                    creep.drop(RESOURCE_ENERGY);
                    resetCreep(creep);
                }
            }
        }
    }
}

