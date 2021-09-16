import { Budget, BudgetGenerator, Ledger } from "Budgets";
import { sumBudgets } from "./sum";

const MAX_TRIES = 5;

export function fitBudgets(constraints: Budget, budgets: Map<string, BudgetGenerator>): Ledger {
    let testConstraints = { ...constraints };
    let ledger = new Map<string, Budget>();
    for (let [id, generator] of budgets) {
        ledger.set(id, generator(testConstraints))
    }
    let result = sumBudgets(...ledger.values());
    for (let i = 0; i < MAX_TRIES; i += 1) {
        // Calculate how far over budget we are
        let differential = Math.max(
            result.energy / testConstraints.energy,
            result.cpu / testConstraints.cpu,
            result.spawn / testConstraints.spawn
        );

        // Under budget? Great! We'll return here
        if (differential <= 1) break;

        // Otherwise, reduce the energy proportionally to how far over we are and try again
        testConstraints.energy /= differential;
        for (let [id, generator] of budgets) {
            ledger.set(id, generator(testConstraints))
        }
        result = sumBudgets(...ledger.values());
    }
    return ledger;
}
