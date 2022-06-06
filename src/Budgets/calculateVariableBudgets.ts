import { Budget, BudgetGenerator } from "Budgets";
import { PrioritizedObjectives } from "Objectives";
import { FranchiseObjective } from "Objectives/Franchise";
import { LogisticsObjective } from "Objectives/Logistics";
import { PriorityLogisticsObjective } from "Objectives/PriorityLogistics";
import { ReserveObjective } from "Objectives/Reserve";
import { fromObjective } from "./BudgetGenerators/fromObjective";
import { fitBudgets } from "./fit";

export function calculateVariableBudgets(office: string) {
    const variableBudgetGenerators = new Map<string, BudgetGenerator>();
    for (let objective of PrioritizedObjectives) {
        if (!(
            objective.hasFixedBudget(office) ||
            objective instanceof FranchiseObjective ||
            objective instanceof PriorityLogisticsObjective ||
            objective instanceof ReserveObjective ||
            objective instanceof LogisticsObjective
        )) {
            variableBudgetGenerators.set(objective.id, fromObjective(objective, office))
        }
    }
    // console.log('budgetGenerators', ...variableBudgetGenerators.entries())
    return (constraints: Budget) => fitBudgets(constraints, variableBudgetGenerators);
}
