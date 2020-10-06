import { TaskPlan } from "TaskRequests/resolveTaskTrees";
import { TaskRequest } from "TaskRequests/TaskRequest";

type Rated<T, Output> = {
    value: T,
    rating: number,
    output: Output
}

export function calculatePreferences<TaskRequest, Creep, TaskPlan>(
    proposers: TaskRequest[],
    accepters: Creep[],
    comparison: (p: TaskRequest, a: Creep) => {rating: number, output: TaskPlan|null}) {
        let results = {
            accepters: new Map<Creep, Map<TaskRequest, Rated<TaskRequest, TaskPlan>>>(),
            proposers: new Map<TaskRequest, {priorities: Rated<Creep, TaskPlan>[], map: Map<Creep, Rated<Creep, TaskPlan>>}>()
        }
        accepters.forEach(a => results.accepters.set(a, new Map<TaskRequest, Rated<TaskRequest, TaskPlan>>()))

        proposers.forEach(p => {

            let map = new Map<Creep, Rated<Creep, TaskPlan>>();
            accepters.forEach(a => {
                const {rating, output} = comparison(p, a)
                if (output !== null) {
                    results.accepters.get(a)?.set(p, {value: p, rating, output});
                    map.set(a, {value: a, rating, output});
                }
            })
            results.proposers.set(p, {
                priorities: [...map.values()].sort((a, b) => a.rating - b.rating),
                map
            });
        });

        return results;
}
export function stablematch(
    proposers: TaskRequest[],
    accepters: Creep[],
    comparison: (p: TaskRequest, a: Creep) => {rating: number, output: TaskPlan|null}): [Creep, TaskRequest, TaskPlan][] {
        let preferences = calculatePreferences(proposers, accepters, comparison);

        let capacities = new Map<TaskRequest, number>();
        let pool = [...proposers];
        pool.forEach(proposer => (capacities.set(proposer, proposer.capacity)));

        let matches = new Map<Creep, Rated<TaskRequest, TaskPlan>>();
        while (pool.length > 0) {
            let p = pool.shift();
            if (!p) continue;
            // Propose to favored match
            let idealMatch = preferences.proposers.get(p)?.priorities.shift()?.value;
            if (!idealMatch) continue;
            let ratedProposer = preferences.accepters.get(idealMatch)?.get(p);
            if (!ratedProposer || !ratedProposer.output) continue; // Minion cannot fulfill task request
            let existingMatch = matches.get(idealMatch);
            if (!existingMatch) {
                // Accepter has no proposals yet: provisionally accept
                matches.set(idealMatch, ratedProposer);
                // Reduce proposer's capacity
                capacities.set(p, (capacities.get(p) as number) - ratedProposer.output.minion.output)
            } else if (existingMatch.rating < ratedProposer.rating) {
                // Accepter trades up
                matches.set(idealMatch, ratedProposer);
                // Jilted proposer moves back to the pool
                pool.push(existingMatch.value);
                // Add capacity back to jilted proposer
                capacities.set(existingMatch.value, (capacities.get(existingMatch.value) as number) + existingMatch.output.minion.output)
            } else {
                pool.push(p);
                // Accepter rejects proposer: keep going down the priority list
            }
        }
        return [...matches.entries()].map(([a, p]) => [a, p.value, p.output]);
}
