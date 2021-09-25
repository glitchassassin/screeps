import { Budget } from "Budgets";
import { fromLogisticsObjective } from "./BudgetGenerators/fromLogisticsObjective";
import { calculateVariableBudgets } from "./calculateVariableBudgets";
import { sumBudgets } from "./sum";

const MAX_TRIES = 5;

export function constrainVariableToLogisticsBudgets(office: string, constraints: Budget) {
    const calculateLogistics = fromLogisticsObjective(office);
    let testConstraints = { ...constraints };
    let expenseBudgets = calculateVariableBudgets(office)(testConstraints);
    let logisticsBudget = calculateLogistics(sumBudgets(...expenseBudgets.values()));
    let totalBudget = sumBudgets(...expenseBudgets.values(), logisticsBudget);
    for (let i = 0; i < MAX_TRIES; i += 1) {
        // console.log(office, 'budgets', JSON.stringify([...expenseBudgets.entries()], null, 2))
        // console.log(office, 'logistics', JSON.stringify(logisticsBudget, null, 2))
        // console.log(office, 'total', JSON.stringify(totalBudget, null, 2))
        // Calculate how far over budget we are
        let differential = Math.max(
            totalBudget.energy / testConstraints.energy,
            totalBudget.cpu / testConstraints.cpu,
            totalBudget.spawn / testConstraints.spawn
        );

        // Under budget? Great! We'll return here
        if (isNaN(differential) || differential <= 1) break;

        // Otherwise, reduce the energy proportionally to how far over we are and try again
        testConstraints.energy /= differential;
        expenseBudgets = calculateVariableBudgets(office)(testConstraints);
        logisticsBudget = calculateLogistics(sumBudgets(...expenseBudgets.values()));
        totalBudget = sumBudgets(...expenseBudgets.values(), logisticsBudget);
    }
    return expenseBudgets;
}
