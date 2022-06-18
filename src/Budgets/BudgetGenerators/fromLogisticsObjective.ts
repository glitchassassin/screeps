import { Budget, BudgetGenerator } from "Budgets";
import { LogisticsObjective } from "OldObjectives/Logistics";
import { Objectives } from "OldObjectives/Objective";

export function fromLogisticsObjective(office: string): BudgetGenerator {
    return (constraints: Budget) => (Objectives['LogisticsObjective'] as LogisticsObjective).budgetThroughput(office, constraints.energy)
}
