import { BaseBudgetConstraints, Budget, BudgetGenerator, Budgets, TotalBudgetConstraints } from "Budgets"
import { Objectives } from "Objectives/Objective"
import { franchiseIncomePerTick } from "Selectors/franchiseStatsPerTick"
import { getSpawns } from "Selectors/roomPlans"
import { logCpu, logCpuStart } from "utils/logCPU"
import { fromObjective } from "./BudgetGenerators/fromObjective"
import { calculateFixedBudgets } from "./calculateFixedBudgets"
import { constrainVariableToLogisticsBudgets } from "./constrainVariableToLogisticsBudgets"
import { fitBudgets } from "./fit"
import { subtractBudgets } from "./subtract"
import { sumBudgets } from "./sum"

export function calculateBudgets(office: string) {
    logCpuStart()
    if (Budgets.has(office) && Game.time % 50 !== 0) return;
    const ledger = new Map<string, Budget>();
    // Set baseline
    const SPAWN_EFFICIENCY = 0.85;
    const baseline: Budget = {
        cpu: Game.cpu.limit / Object.keys(Memory.offices).length,
        spawn: getSpawns(office).length * CREEP_LIFE_TIME * SPAWN_EFFICIENCY,
        energy: (Game.rooms[office].energyAvailable < 300 ? 1 : 0) + franchiseIncomePerTick(office),
    };
    BaseBudgetConstraints.set(office, baseline);
    logCpu('Baselines')

    // Calculate fixed expenses
    const fixedExpenses = calculateFixedBudgets(office);
    for (let [id, budget] of fixedExpenses) {
        ledger.set(id, budget);
    }
    logCpu('Fixed Expenses')

    // Calculate net baseline for variable expenses
    const netBaseline = subtractBudgets(baseline, sumBudgets(...fixedExpenses.values()));
    logCpu('Net Baseline')

    // Fit variable expenses and logistics
    const variableExpenses = constrainVariableToLogisticsBudgets(office, netBaseline);
    for (let [id, budget] of variableExpenses) {
        ledger.set(id, budget);
    }
    logCpu('Variable Expenses')
    const logisticsGenerator = new Map<string, BudgetGenerator>();
    logisticsGenerator.set('LogisticsObjective', fromObjective(Objectives['LogisticsObjective'], office))
    const logisticsExpenses = fitBudgets(
        subtractBudgets(netBaseline, ...variableExpenses.values()),
        logisticsGenerator
    )
    ledger.set('LogisticsExpenses', logisticsExpenses.get('LogisticsObjective')!);
    logCpu('Logistics Expenses')

    TotalBudgetConstraints.set(office, sumBudgets(...ledger.values()))

    Budgets.set(office, ledger);
    logCpu('Totals')
}
