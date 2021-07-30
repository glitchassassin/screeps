import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";
import { roomPlans } from "Selectors/roomPlans";

export const getEnergyFromLink = (creep: Creep): BehaviorResult => {
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) return BehaviorResult.SUCCESS;

    const link = roomPlans(creep.memory.office)?.office.headquarters.link.structure as StructureLink|undefined;
    if (!link || link.store.getUsedCapacity(RESOURCE_ENERGY) === 0) return BehaviorResult.FAILURE;

    moveTo(link.pos, 1)(creep);
    if (creep.withdraw(link, RESOURCE_ENERGY) === OK) {
        return BehaviorResult.SUCCESS;
    }
    return BehaviorResult.INPROGRESS;
}
