import { BudgetGenerator } from "Budgets";

export function fixedEnergy(energy: number): BudgetGenerator {
    return () => ({
        cpu: 0,
        spawn: 0,
        energy
    })
}
