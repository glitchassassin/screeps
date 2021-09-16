import { Budget, BudgetGenerator } from "Budgets";
import { Objective } from "Objectives/Objective";

export function fromObjective(objective: Objective, office: string): BudgetGenerator {
    return (constraints: Budget) => objective.budget(office, constraints.energy)
}
