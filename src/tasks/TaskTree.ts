import { Task } from "./Task"
import { SpeculativeMinion } from "./SpeculativeMinion";
import { TaskAction } from "./TaskAction";

type TaskPlan = {
    cost: number,
    minion: SpeculativeMinion,
    tasks: TaskAction[]
}

export const resolveTaskTrees = (minion: SpeculativeMinion, task: TaskAction): TaskPlan[]|null => {
    let taskPlan = {
        cost: task.cost(minion),
        minion,
        tasks: [task]
    }
    let prereqs = task.getPrereqs();
    if (prereqs.length === 0 || prereqs.every(p => p.met(minion))) {
        // No prereqs - return a plan for just this task
        return [taskPlan]
    }
    let plans: TaskPlan[] = [];
    for (let i = 0; i < prereqs.length; i++) {
        let prereq = prereqs[i]
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
    // Add this task to prerequisite plans
    return plans.map(plan => ({
        cost: plan.cost + taskPlan.cost,
        minion: plan.minion,
        tasks: plan.tasks.concat(taskPlan.tasks)
    }));
}

