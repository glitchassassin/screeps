import { MinionBuilders, MinionTypes } from "./minionTypes";

export const spawnBudget = (availableEnergy: number, targets: Partial<Record<MinionTypes, number>>) => {
    let totalCost = 0;
    for (let minionType in targets) {
        const body = MinionBuilders[minionType as MinionTypes](availableEnergy);
        let energyCost = body.reduce((sum, part) => sum + BODYPART_COST[part], 0);

        // Spawn cost per tick of creep's life
        if (body.some(p => p === CLAIM)) {
            totalCost += (energyCost * targets[minionType as MinionTypes]!) / 600;
        } else {
            totalCost += (energyCost * targets[minionType as MinionTypes]!) / 1500;
        }
    }
    return totalCost;
}
