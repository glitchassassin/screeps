import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";
import { roomPlans } from "Selectors/roomPlans";

export const getEnergyFromLegalContainer = (creep: Creep): BehaviorResult => {
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return BehaviorResult.SUCCESS;

    const container = roomPlans(creep.memory.office)?.office.headquarters.container.structure as StructureContainer|undefined;
    if (!container || container.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return BehaviorResult.FAILURE;

    moveTo(container.pos, 1)(creep);
    if (creep.withdraw(container, RESOURCE_ENERGY) === OK) {
        return BehaviorResult.SUCCESS;
    }
    return BehaviorResult.INPROGRESS;
}
