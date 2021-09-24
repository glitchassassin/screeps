import { Budget } from "Budgets";

export function subtractBudgets(base: Budget, ...budgets: Budget[]) {
    return budgets.reduce((sum, budget) => {
        sum.cpu = Math.max(0, sum.cpu - (isNaN(budget.cpu) ? 0 : budget.cpu));
        sum.spawn = Math.max(0, sum.spawn - (isNaN(budget.spawn) ? 0 : budget.spawn));
        sum.energy = Math.max(0, sum.energy - (isNaN(budget.energy) ? 0 : budget.energy));
        return sum;
    }, {...base})
}
