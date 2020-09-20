type Rated<T, Output> = {
    value: T,
    rating: number,
    output: Output
}

export function calculatePreferences<Proposer, Accepter, Result>(
    proposers: Proposer[],
    accepters: Accepter[],
    comparison: (p: Proposer, a: Accepter) => {pRating: number, aRating: number, output: Result}) {
        let results = {
            accepters: new Map<Accepter, Map<Proposer, Rated<Proposer, Result>>>(),
            proposers: new Map<Proposer, {priorities: Rated<Accepter, Result>[], map: Map<Accepter, Rated<Accepter, Result>>}>()
        }
        accepters.forEach(a => results.accepters.set(a, new Map<Proposer, Rated<Proposer, Result>>()))

        proposers.forEach(p => {

            let map = new Map<Accepter, Rated<Accepter, Result>>();
            accepters.forEach(a => {
                const {pRating, aRating, output} = comparison(p, a)
                results.accepters.get(a)?.set(p, {value: p, rating: pRating, output});
                map.set(a, {value: a, rating: aRating, output});
            })
            results.proposers.set(p, {
                priorities: [...map.values()].sort((a, b) => b.rating - a.rating),
                map
            });
        });

        return results;
}
export function stablematch<Proposer, Accepter, Result>(
    proposers: Proposer[],
    accepters: Accepter[],
    comparison: (p: Proposer, a: Accepter) => {pRating: number, aRating: number, output: Result}): [Accepter, Proposer, Result][] {
        let preferences = calculatePreferences(proposers, accepters, comparison);
        let pool = [...proposers];
        let matches = new Map<Accepter, Rated<Proposer, Result>>();
        while (pool.length > 0) {
            let p = pool.shift();
            if (!p) continue;
            // Propose to favored match
            let idealMatch = preferences.proposers.get(p)?.priorities.shift()?.value;
            if (!idealMatch) continue;
            let ratedProposer = preferences.accepters.get(idealMatch)?.get(p);
            if (!ratedProposer) continue;
            let existingMatch = matches.get(idealMatch);
            if (!existingMatch) {
                // Accepter has no proposals yet: provisionally accept
                matches.set(idealMatch, ratedProposer);
            } else if (existingMatch.rating < ratedProposer.rating) {
                // Accepter trades up
                matches.set(idealMatch, ratedProposer);
                // Jilted proposer moves back to the pool
                pool.push(existingMatch.value);
            } else {
                pool.push(p);
                // Accepter rejects proposer: keep going down the priority list
            }
        }
        return [...matches.entries()].map(([a, p]) => [a, p.value, p.output]);
}
