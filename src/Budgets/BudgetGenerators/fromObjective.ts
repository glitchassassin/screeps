import { Budget, BudgetGenerator } from "Budgets";
import { Objective } from "Objectives/Objective";

export function fromObjective(objective: Objective, office: string): BudgetGenerator {
    return (constraints: Budget) => {
        // logCpuStart()
        // if (isNaN(constraints.energy)) throw new Error('Constraint energy is NaN')
        const result = objective.budget(office, constraints.energy);
        // if (isNaN(result.energy)) console.log(`${office} Objective ${objective.id} budget energy is NaN`, JSON.stringify(result))
        // logCpu('budget for ' + objective.id)
        return result;
    }
}
