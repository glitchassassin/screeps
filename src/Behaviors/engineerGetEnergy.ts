import profiler from "utils/profiler";
import { BehaviorResult } from "./Behavior";
import { getEnergyFromRuin } from "./getEnergyFromRuin";
import { getEnergyFromSource } from "./getEnergyFromSource";
import { getEnergyFromStorage } from "./getEnergyFromStorage";
import { States } from "./states";

declare global {
    interface CreepMemory {
        getEnergyState?: States
    }
}

export const engineerGetEnergy = profiler.registerFN((creep: Creep, targetRoom?: string) => {
    const facilitiesTarget = targetRoom ?? creep.memory.office;
    if (!creep.memory.getEnergyState) {
        creep.memory.getEnergyState = States.GET_ENERGY_RUINS
    }
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        return BehaviorResult.SUCCESS;
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_RUINS) {
        // Get energy from legal container, or storage if that doesn't exist
        const result = getEnergyFromRuin(creep);

        if (result === BehaviorResult.SUCCESS) {
            return BehaviorResult.SUCCESS;
        } else if (result === BehaviorResult.FAILURE) {
            creep.memory.getEnergyState = States.GET_ENERGY_STORAGE;
        } else {
            return BehaviorResult.INPROGRESS;
        }
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_STORAGE) {
        if (facilitiesTarget !== creep.memory.office) {
            delete creep.memory.franchiseTarget;
            creep.memory.getEnergyState = States.GET_ENERGY_SOURCE // For work outside the Office, harvest locally
        } else {
            // Get energy from legal container, or storage if that doesn't exist
            let result = getEnergyFromStorage(creep);

            if (result === BehaviorResult.SUCCESS) {
                return BehaviorResult.SUCCESS;
            } else if (result === BehaviorResult.FAILURE) {
                delete creep.memory.depositSource;
                creep.memory.getEnergyState = States.GET_ENERGY_SOURCE
            } else {
                return BehaviorResult.INPROGRESS;
            }
        }
    }
    // if (creep.memory.getEnergyState === States.GET_ENERGY_FRANCHISE) {
    //     if (facilitiesTarget !== creep.memory.office) {
    //         delete creep.memory.franchiseTarget;
    //         creep.memory.getEnergyState = States.GET_ENERGY_SOURCE // For work outside the Office, harvest locally
    //     } else {
    //         let result = getEnergyFromFranchise(creep);
    //         if (result === BehaviorResult.SUCCESS) {
    //             return BehaviorResult.SUCCESS;
    //         } else if (result === BehaviorResult.FAILURE) {
    //             delete creep.memory.franchiseTarget;
    //             creep.memory.getEnergyState = States.GET_ENERGY_SOURCE
    //         } else {
    //             return BehaviorResult.INPROGRESS;
    //         }
    //     }
    // }
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
}, 'engineerGetEnergy')
