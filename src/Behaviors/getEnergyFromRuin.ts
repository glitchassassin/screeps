import { byId } from "Selectors/byId";
import profiler from "utils/profiler";
import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";

declare global {
    interface CreepMemory {
        targetRuin?: Id<Ruin>
    }
}

export const getEnergyFromRuin = profiler.registerFN((creep: Creep) => {
    // Default to specified franchise
    if (!creep.memory.targetRuin || byId(creep.memory.targetRuin)?.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        // Select a new target: closest ruin with energy
        const target = creep.pos.findClosestByRange(FIND_RUINS, { filter: ruin => ruin.store.getUsedCapacity(RESOURCE_ENERGY) !== 0});
        creep.memory.targetRuin = target?.id;
    }

    const ruin = byId(creep.memory.targetRuin);
    if (!ruin) return BehaviorResult.FAILURE;

    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.targetRuin = undefined; // Creep full
        return BehaviorResult.SUCCESS;
    } else {
        if (moveTo(ruin.pos, 1)(creep) === BehaviorResult.SUCCESS) {
            creep.withdraw(ruin, RESOURCE_ENERGY);
        }
    }

    return BehaviorResult.INPROGRESS;
}, 'getEnergyFromRuin')
