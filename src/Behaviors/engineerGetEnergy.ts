import { byId } from "Selectors/byId";
import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { franchiseIsFull } from "Selectors/franchiseIsFull";
import { franchisesByOffice } from "Selectors/franchisesByOffice";
import { getClosestByRange } from "Selectors/MapCoordinates";
import { posById } from "Selectors/posById";
import { roomPlans } from "Selectors/roomPlans";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";
import { memoizeByTick } from "utils/memoizeFunction";
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

const energySourcesByOffice = memoizeByTick(
    (office, withdrawLimit) => office + withdrawLimit,
    (office: string, withdrawLimit: number) => {
        const sources: (Ruin|{id: Id<Source>, pos: RoomPosition, energy: number}|AnyStoreStructure)[] = [];
        // ruins
        Game.rooms[office]
            ?.find(FIND_RUINS, { filter: ruin => ruin.store.getUsedCapacity(RESOURCE_ENERGY) !== 0})
            .forEach(ruin => sources.push(ruin));
        // sources
        franchisesByOffice(office)
            .map(({source}) => ({ id: source, energy: byId(source)?.energy ?? SOURCE_ENERGY_NEUTRAL_CAPACITY, pos: posById(source)! }))
            .filter((source) => (!franchiseIsFull(office, source.id) && source.energy > 0) || franchiseEnergyAvailable(source.id) > 0)
            .forEach(source => sources.push(source));
        // storage
        const storage = (
            roomPlans(office)?.headquarters?.storage.structure ??
            roomPlans(office)?.headquarters?.container.structure ??
            roomPlans(office)?.headquarters?.spawn.structure
        ) as AnyStoreStructure|undefined
        if (storage && storageEnergyAvailable(office) > withdrawLimit) {
            sources.push(storage);
        }
        return sources;
    }
)

export const engineerGetEnergy = profiler.registerFN((creep: Creep, office: string, withdrawLimit = Game.rooms[office].energyCapacityAvailable) => {
    if (!creep.memory.getEnergyState) {
        // Find nearest target
        const source = getClosestByRange(
            creep.pos,
            energySourcesByOffice(office, withdrawLimit)
        )
        if (!source) {
            return;
        } else if (source instanceof Ruin) {
            creep.memory.getEnergyState = States.GET_ENERGY_RUINS;
            creep.memory.targetRuin = source.id
        } else if ('structureType' in source) {
            creep.memory.getEnergyState = States.GET_ENERGY_STORAGE;
        } else {
            if (franchiseIsFull(office, source.id)) {
                if (storageEnergyAvailable(office) > withdrawLimit) {
                    creep.memory.getEnergyState = States.GET_ENERGY_FRANCHISE;
                    creep.memory.depositSource = source.id;
                }
            } else {
                creep.memory.getEnergyState = States.GET_ENERGY_SOURCE;
                creep.memory.franchiseTarget = source.id;
            }
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
