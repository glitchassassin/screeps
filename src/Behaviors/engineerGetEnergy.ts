import { byId } from "Selectors/byId";
import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { franchiseIsFull } from "Selectors/franchiseIsFull";
import { franchisesByOffice } from "Selectors/franchisesByOffice";
import { getClosestByRange, getRangeTo } from "Selectors/MapCoordinates";
import { posById } from "Selectors/posById";
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
        depositSource?: Id<Source>
    }
}

// Energy sources

// Ruins
// Sources (franchise or self-harvest)
// Storage (go based on storage pos, then collect by hierarchy)

export const engineerGetEnergy = profiler.registerFN((creep: Creep, office: string, targetRoom?: string, withdrawLimit = Game.rooms[office].energyCapacityAvailable) => {
    const facilitiesTarget = targetRoom ?? office;
    if (!creep.memory.getEnergyState) {
        // Find nearest target
        const ruin = creep.pos.findClosestByRange(FIND_RUINS, { filter: ruin => ruin.store.getUsedCapacity(RESOURCE_ENERGY) !== 0});
        const ruinRange = ruin?.pos.getRangeTo(creep.pos) ?? Infinity;
        const source = getClosestByRange(
            creep.pos,
            franchisesByOffice(office)
                .map(({source}) => ({ id: source, energy: byId(source)?.energy ?? SOURCE_ENERGY_NEUTRAL_CAPACITY, pos: posById(source)! }))
                .filter((source) => (!franchiseIsFull(creep, office, source.id) && source.energy > 0) || franchiseEnergyAvailable(source.id) > 0)
        )
        const sourceRange = source ? getRangeTo(creep.pos, source.pos) : Infinity;
        const storage = roomPlans(office)?.headquarters?.storage.pos;
        const storageRange = (storage && storageEnergyAvailable(facilitiesTarget) > withdrawLimit) ? getRangeTo(storage, creep.pos) ?? Infinity : Infinity;
        const minRange = Math.min(ruinRange, sourceRange, storageRange);

        // console.log(creep.name, 'ruin', ruinRange, 'source', sourceRange, 'storage', storageRange, 'min', minRange)

        if (minRange === Infinity) {
            return;
        } else if (ruin && minRange === ruinRange) {
            creep.memory.getEnergyState = States.GET_ENERGY_RUINS;
            creep.memory.targetRuin = ruin.id
        } else if (source && minRange === sourceRange) {
            if (franchiseIsFull(creep, office, source.id)) {
                if (storageEnergyAvailable(facilitiesTarget) > withdrawLimit) {
                    creep.memory.getEnergyState = States.GET_ENERGY_FRANCHISE;
                    creep.memory.depositSource = source.id;
                }
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
        let result = getEnergyFromStorage(creep, office, withdrawLimit);
        if (result !== BehaviorResult.INPROGRESS) {
            delete creep.memory.getEnergyState;
        }
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_FRANCHISE) {
        let result = getEnergyFromFranchise(creep);
        if (result !== BehaviorResult.INPROGRESS) {
            delete creep.memory.getEnergyState;
        }
    }
    if (creep.memory.getEnergyState === States.GET_ENERGY_SOURCE) {
        let result = getEnergyFromSource(creep, office);
        if (result !== BehaviorResult.INPROGRESS) {
            delete creep.memory.getEnergyState;
        }
    }
    return BehaviorResult.INPROGRESS;
}, 'engineerGetEnergy')
