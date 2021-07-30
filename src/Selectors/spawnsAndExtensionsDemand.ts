import { roomPlans } from "./roomPlans";

export const spawnsAndExtensions = (room: string) => {
    const plan = roomPlans(room)?.office;
    if (!plan) return [];
    return [
        ...plan.extensions.extensions,
        ...plan.franchise1.extensions,
        plan.franchise1.spawn,
        ...plan.franchise2.extensions,
        plan.franchise2.spawn,
    ]
}

export const spawnsAndExtensionsDemand = (room: string) => {
    return spawnsAndExtensions(room).reduce((sum, s) => {
        return sum + ((s.structure as StructureExtension)?.store.getFreeCapacity(RESOURCE_ENERGY) ?? 0)
    }, 0)
}
