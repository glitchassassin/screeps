import { FranchiseObjective } from "Objectives/Franchise";
import { PrioritizedObjectives } from "Objectives/initializeObjectives";
import { LogisticsObjective } from "Objectives/Logistics";
import { Objective } from "Objectives/Objective";
import { PriorityLogisticsObjective } from "Objectives/PriorityLogistics";
import { ReserveObjective } from "Objectives/Reserve";
import { BaseBudgetConstraints, Budget, Budgets, FranchiseBudgetConstraints, LogisticsBudgetConstraints, NetBudgetConstraints, ObjectiveBudgetConstraints } from "./budgets";
import { franchiseIncomePerTick } from "./franchiseStatsPerTick";
import { getSpawns } from "./roomPlans";

export function sumBudgets(...budgets: Budget[]) {
    return budgets.reduce((sum, budget) => {
        sum.cpu += isNaN(budget.cpu) ? 0 : budget.cpu;
        sum.spawn += isNaN(budget.spawn) ? 0 : budget.spawn;
        sum.energy += isNaN(budget.energy) ? 0 : budget.energy;
        return sum;
    }, {cpu: 0, spawn: 0, energy: 0})
}

export function subtractBudgets(base: Budget, ...budgets: Budget[]) {
    return budgets.reduce((sum, budget) => {
        sum.cpu -= isNaN(budget.cpu) ? 0 : budget.cpu;
        sum.spawn -= isNaN(budget.spawn) ? 0 : budget.spawn;
        sum.energy -= isNaN(budget.energy) ? 0 : budget.energy;
        return sum;
    }, {...base})
}

function cacheObjectiveBudget(office: string, objective: string, budget: Budget) {
    const o = ObjectiveBudgetConstraints.get(office) ?? new Map<string, Budget>();
    ObjectiveBudgetConstraints.set(office, o);
    o.set(objective, budget);
}

function allocateBudgets(office: string, energy: number, objectives: Objective[]): [Budget, Map<string, number>] {
    const budgets = new Map<string, number>();
    let energyRemaining = energy;
    let budgetedExpenses = {
        cpu: 0,
        spawn: 0,
        energy: 0,
    };
    let budgetsToAllocate = objectives.length;
    for (let objective of objectives) {
        let budget = objective.budget(office, energyRemaining / budgetsToAllocate);
        // console.log(energyRemaining, objective.id, JSON.stringify(budget, null, 2));
        budgetsToAllocate -= 1;
        energyRemaining -= Math.min(energyRemaining, budget.energy);
        cacheObjectiveBudget(office, objective.id, budget);
        budgets.set(objective.id, budget.energy + Number.EPSILON);

        if (!budgetedExpenses) {
            budgetedExpenses = budget;
            continue;
        }
        budgetedExpenses = sumBudgets(budgetedExpenses, budget);
    }
    return [budgetedExpenses, budgets];
}

export function calculateObjectiveBudgets() {
    const offices = Object.keys(Memory.offices).length;
    for (let office in Memory.offices) {
        const SPAWN_EFFICIENCY = 0.85
        const baseline: Budget = {
            cpu: Game.cpu.limit / offices,
            spawn: getSpawns(office).length * CREEP_LIFE_TIME * SPAWN_EFFICIENCY,
            energy: (Game.rooms[office].energyAvailable < 300 ? 1 : 0) + franchiseIncomePerTick(office),
        }
        BaseBudgetConstraints.set(office, baseline)

        // console.log('Baseline', JSON.stringify(baseline, null, 2))

        const franchiseObjectives: Objective[] = [];
        const logisticsObjectives: Objective[] = [];
        const cappedObjectives: Objective[] = [];
        const uncappedObjectives: Objective[] = [];
        for (let objective of PrioritizedObjectives) {
            if (
                objective instanceof FranchiseObjective ||
                objective instanceof PriorityLogisticsObjective ||
                objective instanceof ReserveObjective
            ) {
                franchiseObjectives.push(objective);
            } else if (
                objective instanceof LogisticsObjective
            ) {
                logisticsObjectives.push(objective);
            } else if (
                objective.active(office) && objective.budgetIsCapped(office)
            ) {
                cappedObjectives.push(objective)
            } else if (
                objective.active(office)
            ) {
                uncappedObjectives.push(objective)
            } else {
                cacheObjectiveBudget(office, objective.id, {
                    cpu: 0,
                    spawn: 0,
                    energy: 0
                })
            }
        }
        // Sort capped objectives ahead of uncapped objectives. The latter will
        // split the remaining energy evenly
        const budgetedObjectives = cappedObjectives.concat(uncappedObjectives)

        const franchiseExpenses: Budget = sumBudgets(...franchiseObjectives.map(o => o.budget(office, baseline.energy)))

        // console.log('Franchise Expenses', JSON.stringify(franchiseExpenses, null, 2))

        const netBaseline = subtractBudgets(baseline, franchiseExpenses);

        FranchiseBudgetConstraints.set(office, franchiseExpenses)

        // console.log('Net Baseline', JSON.stringify(netBaseline, null, 2))

        let allocatedEnergy = netBaseline.energy;

        // Maximum five loops
        let budgets = new Map<string, number>();
        let finalBudgets: Budget;
        let finalLogisticsBudgets: Budget;
        for (let i = 0; i < 10; i += 1) {
            const [budgetedExpenses, newBudgets] = allocateBudgets(office, allocatedEnergy, budgetedObjectives);
            budgets = newBudgets;
            const logisticsExpenses = sumBudgets(...logisticsObjectives.map(o => o.budget(office, budgetedExpenses?.energy ?? 0)))
            finalLogisticsBudgets = logisticsExpenses;
            budgets.set('LogisticsObjective', logisticsExpenses.energy)

            finalBudgets = subtractBudgets(
                netBaseline,
                sumBudgets(budgetedExpenses, logisticsExpenses)
            )

            // console.log('Budgets', JSON.stringify(finalBudgets, null, 2))

            let cpu = (netBaseline.cpu - finalBudgets.cpu) / netBaseline.cpu;
            let spawn = (netBaseline.spawn - finalBudgets.spawn) / netBaseline.spawn;

            // console.log('cpu', cpu, 'spawn', spawn);

            // console.log('Budgeted Expenses', JSON.stringify(budgetedExpenses, null, 2))
            // console.log('Logistics Expenses', JSON.stringify(logisticsExpenses, null, 2))
            // console.log('Budgets', JSON.stringify(finalBudgets, null, 2))

            if (cpu > 1 && cpu > spawn) {
                allocatedEnergy *= 1 / cpu;
            } else if (spawn > 1 && spawn > cpu) {
                allocatedEnergy *= 1 / spawn;
            } else {
                break;
            }
        }
        NetBudgetConstraints.set(office, subtractBudgets(baseline, finalBudgets!))
        LogisticsBudgetConstraints.set(office, finalLogisticsBudgets!)
        Budgets.set(office, budgets);
    }
}
