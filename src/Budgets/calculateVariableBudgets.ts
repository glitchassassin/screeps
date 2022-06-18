import { Budget, BudgetGenerator } from "Budgets";
import { PrioritizedObjectives } from "OldObjectives";
import { FranchiseObjective } from "OldObjectives/Franchise";
import { LogisticsObjective } from "OldObjectives/Logistics";
import { PriorityLogisticsObjective } from "OldObjectives/PriorityLogistics";
import { ReserveObjective } from "OldObjectives/Reserve";
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
