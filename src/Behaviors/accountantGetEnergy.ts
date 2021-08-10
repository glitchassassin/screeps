import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { sourceIds } from "Selectors/roomCache";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import profiler from "utils/profiler";
import { BehaviorResult } from "./Behavior";
import { getEnergyFromFranchise } from "./getEnergyFromFranchise";
import { getEnergyFromStorage } from "./getEnergyFromStorage";
import { States } from "./states";

declare global {
    interface CreepMemory {
        getEnergyState?: States
    }
}

export const accountantGetEnergy = profiler.registerFN((creep: Creep) => {
    if (!creep.memory.getEnergyState || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.getEnergyState = States.GET_ENERGY_STORAGE;
        const storageAvailable = storageEnergyAvailable(creep.memory.office);
        for (let id of sourceIds(creep.memory.office)) {
            if (franchiseEnergyAvailable(id) > storageAvailable) {
                creep.memory.getEnergyState = States.GET_ENERGY_FRANCHISE;
            }
        }
    }
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        return BehaviorResult.SUCCESS;
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_STORAGE) {
        // Get energy from legal container, or storage if that doesn't exist
        const result = getEnergyFromStorage(creep);

        if (result === BehaviorResult.SUCCESS) {
            return BehaviorResult.SUCCESS;
        } else if (result === BehaviorResult.FAILURE) {
            delete creep.memory.depositSource;
            return BehaviorResult.FAILURE;
        } else {
            return BehaviorResult.INPROGRESS;
        }
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_FRANCHISE) {
        let result = getEnergyFromFranchise(creep);
        if (result === BehaviorResult.SUCCESS) {
            return BehaviorResult.SUCCESS;
        } else if (result === BehaviorResult.FAILURE) {
            delete creep.memory.franchiseTarget;
            return BehaviorResult.FAILURE;
        } else {
            return BehaviorResult.INPROGRESS;
        }
    }
    return BehaviorResult.INPROGRESS;
}, 'accountantGetEnergy')
