import { Task, SpeculativeMinion } from "./Task"

type TaskPlan = {
    cost: number,
    minion: SpeculativeMinion,
    tasks: Task[]
}

// Transfer to Destination
//    -> Needs Energy
//       * Harvest from Source
//        -> Needs to be adjacent
//           * Move to Source
//       * Withdraw from Container
//        -> Needs to be adjacent
//           * Move to Container
//    -> Needs to be adjacent
//       * Move to Destination

// Move to Source -> Harvest Source

// Move to Source -> Harvest Source
// Move to Container -> Harvest Container

// Move to Source -> Harvest Source -> Move to Destination
// Move to Container -> Harvest Container -> Move to Destination

// Move to Source -> Harvest Source -> Move to Destination -> Transfer to Destination
// Move to Container -> Withdraw from Container -> Move to Destination -> Transfer to Destination

export const resolveTaskTrees = (minion: SpeculativeMinion, task: Task): TaskPlan[]|null => {
    let plan = {
        cost: task.cost(minion),
        minion,
        tasks: [task]
    }
    if (task.prereqs.length === 0 || task.prereqs.every(p => p.met(minion))) {
        // No prereqs - return a plan for just this task
        return [plan]
    }
    let plans: TaskPlan[] = [];
    for (let i = 0; i < task.prereqs.length; i++) {
        let prereq = task.prereqs[i]
        if (!prereq.met(minion)) {
            // Get task plans for all prereq alternatives
            let altTasks = prereq.toMeet(minion)

            if (!altTasks || altTasks.length === 0) { return null; } // Prereq cannot be met

            let altTaskPlans = (altTasks.map(t => resolveTaskTrees(minion, t))
                .filter(t => t) as TaskPlan[][])
                .reduce((a, b) => a?.concat(b), []);

            plans = altTaskPlans.map(taskPlan => { // Array of all potential task plans for all prereq alternatives
                // If a previous prereq had task plans, create
                // a combination of each of the existing task plans
                // with each of the new alternate task plans
                if (plans.length === 0) {
                    return [taskPlan]
                } else {
                    return plans.map(plan => {
                        return {
                            cost: plan.cost + taskPlan.cost,
                            minion: taskPlan.minion,
                            tasks: plan.tasks.concat(taskPlan.tasks)
                        }
                    })
                }
            }).reduce((a, b) => a?.concat(b), []);
        }
    }
    return plans;
}

