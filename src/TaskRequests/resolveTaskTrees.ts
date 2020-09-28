import { Task } from "./Task"
import { SpeculativeMinion } from "./SpeculativeMinion";
import { TaskAction } from "./TaskAction";
import { TaskPrerequisite } from "./TaskPrerequisite";

export type TaskPlan = {
    cost: number,
    minion: SpeculativeMinion,
    tasks: TaskAction[]
}

export const resolveTaskTrees = (minion: SpeculativeMinion, task: TaskAction): TaskPlan[]|null => {
    if (!task.valid()) {
        return null;
    }

    let taskPlan = {
        cost: task.cost(minion),
        minion: task.predict(minion),
        tasks: [task]
    }

    let prereqs = task.getPrereqs();
    let plans: TaskPlan[] = [{cost: 0, minion, tasks: []}];
    // Prereqs:
    //  - Have 50 energy
    //  - Be adjacent to target
    //  - Etc.
    for (let i = 0; i < prereqs.length; i++) {
        let prereq = prereqs[i];
        plans = plans.map(plan => {
            if (prereq.met(plan.minion)) {
                return [plan]; // Prereq met, no action needed
            }

            let altTasks: TaskAction[]|null = prereq.toMeet(plan.minion)
            if (!altTasks || altTasks.length === 0) {
                return [];
            } // Prereq (and therefore this TaskAction) cannot be met

            return ((altTasks as TaskAction[])
                .map(t => { // For each prereq alternative
                    let altTaskPlans = resolveTaskTrees(plan.minion, t)
                    if (!altTaskPlans || altTaskPlans.length === 0) return;
                    return altTaskPlans.map(altTaskPlan => {
                        return {
                            cost: plan.cost + altTaskPlan.cost,
                            minion: t.predict(altTaskPlan.minion),
                            tasks: plan.tasks.concat(altTaskPlan.tasks)
                        }
                    })
                }) // Get task plans for each prereq alternative
                .filter(t => t) as TaskPlan[][]) // Eliminate the impossible ones
                .reduce((a, b) => a?.concat(b), []); // Flatten the array
        }).reduce((a, b) => a?.concat(b), []); // Flatten the combinatorial array
    }
    // Recalculate minion
    return plans.map(p => ({
        cost: p.cost + taskPlan.cost,
        minion: task.predict(p.minion),
        tasks: p.tasks.concat(task)
    }));
}

