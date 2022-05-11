import { getPrimarySpawn } from "Selectors/getPrimarySpawn";
import { roomPlans } from "Selectors/roomPlans";
import profiler from "utils/profiler";
import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";

export const getEnergyFromStorage = profiler.registerFN((creep: Creep, limit?: number): BehaviorResult => {
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return BehaviorResult.SUCCESS;

    const hq = roomPlans(creep.memory.office)?.headquarters;
    const storage = hq?.storage.structure as StructureStorage|undefined;
    const container = hq?.container.structure as StructureContainer|undefined;
    const spawn = getPrimarySpawn(creep.memory.office) as StructureSpawn|undefined;

    const withdrawLimit = limit ?? Game.rooms[creep.memory.office]?.energyCapacityAvailable

    let target = undefined;
    if ((storage?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) > withdrawLimit) {
        target = storage;
    } else if ((container?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) > withdrawLimit) {
        target = container;
    } else if (!storage && !container && (spawn?.store.getUsedCapacity(RESOURCE_ENERGY) ?? 0) >= 300) {
        target = spawn;
    }

    if (!target) {
        return BehaviorResult.FAILURE;
    }

    moveTo(target.pos, 1)(creep);
    if (creep.withdraw(target, RESOURCE_ENERGY) === OK) {
        return BehaviorResult.SUCCESS;
    }
    return BehaviorResult.INPROGRESS;
}, 'getEnergyFromStorage')
