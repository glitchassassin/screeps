import { LabOrder } from "Objectives/Labs/LabOrder";
import { Objectives } from "Objectives/Objective";
import { getLabs } from "./getLabs";

export function ingredientsNeededForLabOrder(office: string, order: LabOrder) {
    // In Process ingredients are in Scientists' inventories or input labs
    // In Process products are in Scientists' inventories or output labs
    const { inputs, outputs } = getLabs(office);
    const scientists = Objectives['ScienceObjective'].minions(office);

    const product = scientists.reduce((sum, c) => sum + c.store.getUsedCapacity(order.output), 0) +
        outputs.reduce((sum, c) => sum + ((c.structure as StructureLab)?.store.getUsedCapacity(order.output) ?? 0), 0)

    const ingredient1 = scientists.reduce((sum, c) => sum + c.store.getUsedCapacity(order.ingredient1), 0) +
        inputs.reduce((sum, c) => sum + ((c.structure as StructureLab)?.store.getUsedCapacity(order.ingredient1) ?? 0), 0)

    const ingredient2 = scientists.reduce((sum, c) => sum + c.store.getUsedCapacity(order.ingredient2), 0) +
        inputs.reduce((sum, c) => sum + ((c.structure as StructureLab)?.store.getUsedCapacity(order.ingredient2) ?? 0), 0)

    const target = order.amount - product;

    return {
        ingredient1: Math.max(0, target - ingredient1),
        ingredient2: Math.max(0, target - ingredient2),
    }
}
