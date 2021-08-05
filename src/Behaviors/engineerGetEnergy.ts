import { BehaviorResult } from "./Behavior";
import { States } from "./states";
import { getEnergyFromFranchise } from "./getEnergyFromFranchise";
import { getEnergyFromLegalContainer } from "./getEnergyFromLegalContainer";
import { getEnergyFromSource } from "./getEnergyFromSource";
import { getEnergyFromStorage } from "./getEnergyFromStorage";
import { roomPlans } from "Selectors/roomPlans";

declare global {
    interface CreepMemory {
        getEnergyState?: States
    }
}

export const engineerGetEnergy = (creep: Creep, targetRoom?: string) => {
    const facilitiesTarget = targetRoom ?? creep.memory.office;
    if (!creep.memory.getEnergyState || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.getEnergyState = States.GET_ENERGY_STORAGE
    }
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        return BehaviorResult.SUCCESS;
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_STORAGE) {
        if (facilitiesTarget !== creep.memory.office) {
            delete creep.memory.franchiseTarget;
            creep.memory.getEnergyState = States.GET_ENERGY_SOURCE // For work outside the Office, harvest locally
        } else {
            // Get energy from legal container, or storage if that doesn't exist
            const container = roomPlans(creep.memory.office)?.office?.headquarters.container;
            if (!container) return;
            let result;
            if (container.structure) {
                result = getEnergyFromLegalContainer(creep);
            } else {
                result = getEnergyFromStorage(creep);
            }

            if (result === BehaviorResult.SUCCESS) {
                return BehaviorResult.SUCCESS;
            } else if (result === BehaviorResult.FAILURE) {
                delete creep.memory.depositSource;
                creep.memory.getEnergyState = States.GET_ENERGY_FRANCHISE
            } else {
                return BehaviorResult.INPROGRESS;
            }
        }
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_FRANCHISE) {
        if (facilitiesTarget !== creep.memory.office) {
            delete creep.memory.franchiseTarget;
            creep.memory.getEnergyState = States.GET_ENERGY_SOURCE // For work outside the Office, harvest locally
        } else {
            let result = getEnergyFromFranchise(creep);
            if (result === BehaviorResult.SUCCESS) {
                return BehaviorResult.SUCCESS;
            } else if (result === BehaviorResult.FAILURE) {
                delete creep.memory.franchiseTarget;
                creep.memory.getEnergyState = States.GET_ENERGY_SOURCE
            } else {
                return BehaviorResult.INPROGRESS;
            }
        }
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_SOURCE) {
        let result = getEnergyFromSource(creep, facilitiesTarget);
        if (result === BehaviorResult.SUCCESS) {
            return BehaviorResult.SUCCESS;
        } else if (result === BehaviorResult.FAILURE) {
            creep.memory.getEnergyState = States.GET_ENERGY_STORAGE
            return BehaviorResult.INPROGRESS;
        }
    }
    return BehaviorResult.INPROGRESS;
}
