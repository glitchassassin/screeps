import { RESOURCE_INGREDIENTS } from "gameConstants";
import { LabOrder } from "./LabOrder";

/**
 * Decrements availableResources if it can pull from there instead of submitting an order
 */
function getOrderForIngredient(ingredient: ResourceConstant, amount: number, availableResources: Map<ResourceConstant, number>) {
    if (ingredient in RESOURCE_INGREDIENTS) {
        // Check for existing resources
        const existing = availableResources.get(ingredient);
        let reserved = 0;
        if (existing) {
            reserved = Math.min(amount, existing);
            availableResources.set(ingredient, existing - reserved);
        }
        if (amount - reserved === 0) return; // No need for an order, we have what we need
        return {
            ingredient1: RESOURCE_INGREDIENTS[ingredient as MineralCompoundConstant][0],
            ingredient2: RESOURCE_INGREDIENTS[ingredient as MineralCompoundConstant][1],
            amount: amount - reserved,
            output: ingredient,
        }
    }
    return;
}

export function getAvailableResourcesFromTerminal(terminal: StructureTerminal) {
    const availableResources = new Map<ResourceConstant, number>();
    for (let resource in terminal.store) {
        availableResources.set(resource as ResourceConstant, terminal.store.getUsedCapacity(resource as ResourceConstant))
    }
    return availableResources;
}

export function getLabOrderDependencies(order: LabOrder, availableResources: Map<ResourceConstant, number>): LabOrder[] {
    const ingredients: LabOrder[] = [
        getOrderForIngredient(order.ingredient1, order.amount, availableResources),
        getOrderForIngredient(order.ingredient2, order.amount, availableResources),
    ].filter(o => o !== undefined) as LabOrder[];
    return ingredients.flatMap(o => getLabOrderDependencies(o, availableResources)).concat(ingredients)
}

export function getLabOrders(ingredient: ResourceConstant, amount: number, terminal: StructureTerminal) {
    const available = getAvailableResourcesFromTerminal(terminal);
    // Don't count existing quantity of this ingredient
    available.set(ingredient, 0);
    const target = getOrderForIngredient(ingredient, amount, available);
    if (target) {
        return getLabOrderDependencies(target, available).concat(target);
    } else {
        return [];
    }
}
