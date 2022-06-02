import { BaseBudgetConstraints, Budget, BudgetGenerator, Budgets, TotalBudgetConstraints } from "Budgets"
import { Objectives } from "Objectives/Objective"
import { calculateBaselineEnergy } from "Selectors/calculateBaselineEnergy"
import { franchiseIncomePerTick } from "Selectors/franchiseStatsPerTick"
import { getSpawns } from "Selectors/roomPlans"
import { fromLogisticsObjective } from "./BudgetGenerators/fromLogisticsObjective"
import { fromObjective } from "./BudgetGenerators/fromObjective"
import { calculateFixedBudgets } from "./calculateFixedBudgets"
import { constrainVariableToLogisticsBudgets } from "./constrainVariableToLogisticsBudgets"
import { fitBudgets } from "./fit"
import { subtractBudgets } from "./subtract"
import { sumBudgets } from "./sum"

export function calculateBudgets(office: string) {
    if (Budgets.has(office) && Game.time % 50 !== 0) return;
    const ledger = new Map<string, Budget>();
    // Set baseline
    const SPAWN_EFFICIENCY = 0.85;
    const RESTORE_CPU = Game.cpu.bucket > (10000 / 2) ? 1 : 0.8;
    const baseline: Budget = {
        cpu: (Game.cpu.limit / Object.keys(Memory.offices).length) * RESTORE_CPU,
        spawn: getSpawns(office).length * CREEP_LIFE_TIME * SPAWN_EFFICIENCY,
        energy: calculateBaselineEnergy(office),
    };
    BaseBudgetConstraints.set(office, baseline);

    // Calculate fixed expenses
    const fixedExpenses = calculateFixedBudgets(office);
    for (let [id, budget] of fixedExpenses) {
        ledger.set(id, budget);
    }

    // Calculate net baseline for variable expenses
    const netBaseline = subtractBudgets(baseline, sumBudgets(...fixedExpenses.values()));

    // console.log('netBaseline', JSON.stringify(netBaseline, null, 2))

    // Fit variable expenses and logistics
    const variableExpenses = constrainVariableToLogisticsBudgets(office, netBaseline);
    for (let [id, budget] of variableExpenses) {
        ledger.set(id, budget);
    }

    // Cap logistics budget to actual max throughput
    const maxLogisticsBudget = fromLogisticsObjective(office)({
        energy: franchiseIncomePerTick(office),
        cpu: 0,
        spawn: 0
    });

    // console.log('variableExpenses', JSON.stringify(sumBudgets(...variableExpenses.values()), null, 2))
    const logisticsGenerator = new Map<string, BudgetGenerator>();
    logisticsGenerator.set('LogisticsObjective', (constraints: Budget) => {
        const budget = fromObjective(Objectives['LogisticsObjective'], office)(constraints);
        if (budget.energy < maxLogisticsBudget.energy) return budget;
        return maxLogisticsBudget;
    })
    const logisticsExpenses = fitBudgets(
        subtractBudgets(netBaseline, ...variableExpenses.values()),
        logisticsGenerator
    )
    // Add budgeted PriorityLogistics
    ledger.set('LogisticsObjective', sumBudgets(
        ledger.get('PriorityLogisticsObjective')!,
        logisticsExpenses.get('LogisticsObjective')!
    ));

    // Total should ignore PriorityLogistics
    TotalBudgetConstraints.set(office, subtractBudgets(
        sumBudgets(
            ...ledger.values()
        ),
        ledger.get('PriorityLogisticsObjective')!
    ))

    Budgets.set(office, ledger);
}
