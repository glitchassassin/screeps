import { Budget } from "Budgets";
import { PrioritizedObjectives } from "OldObjectives";
import { FranchiseObjective } from "OldObjectives/Franchise";
import { PriorityLogisticsObjective } from "OldObjectives/PriorityLogistics";
import { ReserveObjective } from "OldObjectives/Reserve";
import { fromObjective } from "./BudgetGenerators/fromObjective";

export function calculateFixedBudgets(office: string) {
    const fixedBudgets = new Map<string, Budget>();
    for (let objective of PrioritizedObjectives) {
        if (
            objective.hasFixedBudget(office) ||
            objective instanceof FranchiseObjective ||
            objective instanceof PriorityLogisticsObjective ||
            objective instanceof ReserveObjective
        ) {
            fixedBudgets.set(objective.id, fromObjective(objective, office)({ cpu: 0, spawn: 0, energy: 1000 }))
        }
    }
    return fixedBudgets;
}
