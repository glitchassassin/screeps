import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { franchiseIsFull } from "Selectors/franchiseIsFull";
import { getRangeTo } from "Selectors/MapCoordinates";
import { roomPlans } from "Selectors/roomPlans";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import profiler from "utils/profiler";
import { BehaviorResult } from "./Behavior";
import { getEnergyFromFranchise } from "./getEnergyFromFranchise";
import { getEnergyFromRuin } from "./getEnergyFromRuin";
import { getEnergyFromSource } from "./getEnergyFromSource";
import { getEnergyFromStorage } from "./getEnergyFromStorage";
import { States } from "./states";

declare global {
    interface CreepMemory {
        getEnergyState?: States
    }
}

// Energy sources

// Ruins
// Sources (franchise or self-harvest)
// Storage (go based on storage pos, then collect by hierarchy)

export const engineerGetEnergy = profiler.registerFN((creep: Creep, targetRoom?: string) => {
    const facilitiesTarget = targetRoom ?? creep.memory.office;
    if (!creep.memory.getEnergyState) {
        // Find nearest target
        const ruin = creep.pos.findClosestByRange(FIND_RUINS, { filter: ruin => ruin.store.getUsedCapacity(RESOURCE_ENERGY) !== 0});
        const ruinRange = ruin?.pos.getRangeTo(creep.pos) ?? Infinity;
        const source = creep.pos.findClosestByRange(FIND_SOURCES, { filter: source => !franchiseIsFull(creep, source.id) || franchiseEnergyAvailable(source.id) > 0});
        const sourceRange = source?.pos.getRangeTo(creep.pos) ?? Infinity;
        const storage = roomPlans(creep.memory.office)?.headquarters?.storage.pos;
        const storageRange = (storage && storageEnergyAvailable(facilitiesTarget) > 0) ? getRangeTo(storage, creep.pos) ?? Infinity : Infinity;
        const minRange = Math.min(ruinRange, sourceRange, storageRange);

        // console.log(creep.name, 'ruin', ruinRange, 'source', sourceRange, 'storage', storageRange, 'min', minRange)

        if (minRange === Infinity) {
            return;
        } else if (ruin && minRange === ruinRange) {
            creep.memory.getEnergyState = States.GET_ENERGY_RUINS;
            creep.memory.targetRuin = ruin.id
        } else if (source && minRange === sourceRange) {
            if (franchiseIsFull(creep, source.id)) {
                creep.memory.getEnergyState = States.GET_ENERGY_FRANCHISE;
                creep.memory.depositSource = source.id;
            } else {
                creep.memory.getEnergyState = States.GET_ENERGY_SOURCE;
                creep.memory.franchiseTarget = source.id;
            }
        } else if (minRange === storageRange) {
            creep.memory.getEnergyState = States.GET_ENERGY_STORAGE;
        } else {
            return; // no sources
        }
    }
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        delete creep.memory.getEnergyState;
        return BehaviorResult.SUCCESS;
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_RUINS) {
        let result = getEnergyFromRuin(creep);
        if (result !== BehaviorResult.INPROGRESS) {
            delete creep.memory.getEnergyState;
        }
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_STORAGE) {
        let result = getEnergyFromStorage(creep);
        if (result !== BehaviorResult.INPROGRESS) {
            delete creep.memory.getEnergyState;
        }
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_FRANCHISE) {
        let result = getEnergyFromFranchise(creep);
        if (result === BehaviorResult.SUCCESS) {
            delete creep.memory.getEnergyState;
        }
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_SOURCE) {
        let result = getEnergyFromSource(creep);
        if (result === BehaviorResult.SUCCESS) {
            delete creep.memory.getEnergyState;
        }
    }
    return BehaviorResult.INPROGRESS;
}, 'engineerGetEnergy')
