import { Budget } from "Budgets";
import { PrioritizedObjectives } from "Objectives";
import { FranchiseObjective } from "Objectives/Franchise";
import { PriorityLogisticsObjective } from "Objectives/PriorityLogistics";
import { ReserveObjective } from "Objectives/Reserve";
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
