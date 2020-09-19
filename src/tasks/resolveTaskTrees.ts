import { Task } from "./Task"
import { SpeculativeMinion } from "./SpeculativeMinion";
import { TaskAction } from "./TaskAction";

export type TaskPlan = {
    cost: number,
    minion: SpeculativeMinion,
    tasks: TaskAction[]
}

export const resolveTaskTrees = (minion: SpeculativeMinion, task: TaskAction): TaskPlan[]|null => {
    let taskPlan = {
        cost: task.cost(minion),
        minion: task.predict(minion),
        tasks: [task]
    }

    let prereqs = task.getPrereqs();
    if (prereqs.length === 0 || prereqs.every(p => p.met(minion))) {
        // No prereqs - end of the line. Return a plan for just this task
        // Since we're heading back up the tree, predict the speculative
        // minion for this task plan
        return [{
            ...taskPlan,
            minion: task.predict(minion)
        }]
    }
    let plans: TaskPlan[] = [taskPlan];
    // Prereqs:
    //  - Have 50 energy
    //  - Be adjacent to target
    //  - Etc.
    for (let i = prereqs.length - 1; i >= 0; i--) {
        let prereq = prereqs[i]
        if (!prereq.met(minion)) {
            // Get task plans for all prereq alternatives
            // - Harvest 50 energy
            // - Withdraw 50 energy
            // - Etc.
            let altTasks: TaskAction[]|null = prereq.toMeet(minion)

            if (!altTasks || altTasks.length === 0) {  return null; } // Prereq (and therefore this TaskAction) cannot be met

            // For each existing plan (at least our initial task,
            // and potentially other prerequisite paths)
            plans = plans.map(plan => {
                return ((altTasks as TaskAction[])
                    .map(t => { // For each prereq alternative
                        let altTaskPlans = resolveTaskTrees(plan.minion, t)
                        if (!altTaskPlans || altTaskPlans.length === 0) return;
                        //console.log(t.constructor.name, {...t.predict(plan.minion), pos: {x: plan.minion.pos.x, y: plan.minion.pos.y }, creep: undefined})
                        return altTaskPlans.map(altTaskPlan => ({
                            cost: plan.cost + altTaskPlan.cost,
                            minion: t.predict(plan.minion),
                            tasks: altTaskPlan.tasks.concat(plan.tasks)
                        }))
                    }) // Get task plans for each prereq alternative
                    .filter(t => t) as TaskPlan[][]) // Eliminate the impossible ones
                    .reduce((a, b) => a?.concat(b), []); // Flatten the array
            }).reduce((a, b) => a?.concat(b), []); // Flatten the combinatorial array
        }
    }
    // Recalculate minion
    return plans.map(p => ({
        ...p,
        minion: p.tasks.reduce((a, b) => b.predict(a), minion)
    }));
}

