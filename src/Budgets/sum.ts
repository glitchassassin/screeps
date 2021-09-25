import { Budget } from "Budgets";

export function sumBudgets(...budgets: Budget[]) {
    return budgets.reduce((sum, budget) => {
        sum.cpu += isNaN(budget.cpu) ? 0 : budget.cpu;
        sum.spawn += isNaN(budget.spawn) ? 0 : budget.spawn;
        sum.energy += isNaN(budget.energy) ? 0 : budget.energy;
        return sum;
    }, {cpu: 0, spawn: 0, energy: 0})
}
