import { Budget, BudgetGenerator } from "Budgets";
import { LogisticsObjective } from "Objectives/Logistics";
import { Objectives } from "Objectives/Objective";

export function fromLogisticsObjective(office: string): BudgetGenerator {
    return (constraints: Budget) => (Objectives['LogisticsObjective'] as LogisticsObjective).budgetThroughput(office, constraints.energy)
}
