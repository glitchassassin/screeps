import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { memoizeByTick } from "utils/memoizeFunction";
import { rcl } from "./rcl";
import { roomPlans } from "./roomPlans";

export const getExtensions = (room: string) => {
    const plan = roomPlans(room);
    if (!plan) return [];
    return ([] as PlannedStructure[]).concat(
        plan.extensions?.extensions ?? [],
        plan.franchise1?.extensions ?? [],
        plan.franchise2?.extensions ?? [],
    )
}

export const getRefillTargets = (room: string) => {
    const plan = roomPlans(room);
    if (!plan) return [];
    return ([] as PlannedStructure[]).concat(
        plan.labs?.labs ?? [],
        plan.extensions?.extensions ?? [],
        plan.franchise1?.extensions ?? [],
        plan.franchise2?.extensions ?? [],
        // If we have no container for some reason, HQ spawn is a fallback source - don't refill
        (plan.headquarters?.container.structure ? plan.headquarters?.spawn : []) ?? [],
        plan.franchise1?.spawn ?? [],
        plan.franchise2?.spawn ?? [],
    )
}

export const getEnergyStructures = memoizeByTick(
    room => room,
    (room: string) => {
        const plan = roomPlans(room);
        if (!plan) return [];
        const structures = ([] as (PlannedStructure|undefined)[]).concat(
            [plan.headquarters?.spawn],
            plan.extensions?.extensions ?? [],
            plan.franchise1?.extensions ?? [],
            [plan.franchise1?.spawn],
            plan.franchise2?.extensions ?? [],
            [plan.franchise2?.spawn],
        ).map(s => s?.structure).filter(s => s) as (StructureExtension|StructureSpawn)[]

        if (Memory.rooms[room].rclMilestones?.[rcl(room)+1]) {
            // Room is downleveled
            return structures.filter(e => e.isActive())
        }
        return structures;
    }
)

export const extensionsDemand = (room: string) => {
    return getExtensions(room).reduce((sum, s) => {
        return sum + ((s.structure as StructureExtension)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0)
    }, 0)
}
