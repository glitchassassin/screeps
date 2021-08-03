import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";
import { resourcesNearPos } from "Selectors/resourcesNearPos";
import { roomPlans } from "Selectors/roomPlans";
import { storageEnergyAvailable } from "Selectors/storageEnergyAvailable";

export const getEnergyFromStorage = (creep: Creep): BehaviorResult => {
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return BehaviorResult.SUCCESS;

    const storage = roomPlans(creep.memory.office)?.office.headquarters.storage;
    if (!storage || storageEnergyAvailable(creep.memory.office) === 0) return BehaviorResult.FAILURE;

    if (storage.structure) {
        moveTo(storage.pos, 1)(creep);
        if (creep.withdraw(storage.structure, RESOURCE_ENERGY) === OK) {
            return BehaviorResult.SUCCESS;
        }
    } else {
        const res = resourcesNearPos(storage.pos, 1, RESOURCE_ENERGY).shift();
        if (!res) return BehaviorResult.FAILURE;
        moveTo(res.pos, 1)(creep);
        if (creep.pickup(res) === OK) {
            return BehaviorResult.SUCCESS;
        }
    }
    return BehaviorResult.INPROGRESS;
}
