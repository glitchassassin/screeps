
interface Operand<T> {
    value: T,
    capacity?: number
}

interface Match<T> {
    rating: number,
    match?: T
}

class Proposer<P, A> {
    preferences: Accepter<P, A>[] = [];
    constructor(
        public value: P,
        public capacity: number
    ) {};
}

class Accepter<P, A> {
    preferences = new Map<Proposer<P, A>, Match<any>>();
    bestOffer?: Proposer<P, A>;
    constructor(
        public value: A,
        public capacity: number
    ) {};

    result() {
        return this.bestOffer && this.preferences.get(this.bestOffer);
    }
}

/**
 *
 * @param proposers A list of any kind of value with optional capacity
 * @param accepters A list of any kind of value with optional capacity
 * @param matchFunction Compares a proposer and an accepter and returns a rating and an optional match. A lower rating is better than a higher rating.
 */
export const stablematch = <P, A, Result>(
    proposers: Operand<P>[],
    accepters: Operand<A>[],
    matchFunction: (proposer: P, accepter: A) => Match<Result>
) => {
    // Set up pool of proposers
    let pool: Proposer<P, A>[] = [];
    let accepterPool = new Map<Operand<A>, Accepter<P, A>>()
    proposers.forEach(proposer => {
        let p = new Proposer<P, A>(proposer.value, proposer.capacity ?? 1);
        let preferences = new Map<Accepter<P, A>, Match<Result>>()
        accepters.forEach(accepter => {
            let a = accepterPool.get(accepter) ?? new Accepter(accepter.value, accepter.capacity ?? 1);
            let match = matchFunction(proposer.value, accepter.value);
            a.preferences.set(p, match);
            preferences.set(a, match);
            accepterPool.set(accepter, a);
        })
        p.preferences = [...preferences.entries()].sort(([,match1], [,match2]) => match1.rating - match2.rating).map(([a]) => a);
        pool.push(p);
    })

    while (pool.length > 0) {
        let p = pool.shift();
        if (!p) throw new Error('Invalid Proposer'); // Should never be thrown
        // console.log('Proposer: ', p.value);
        let a = p.preferences.shift();
        if (!a) continue; // Proposer has no more preferred accepters
        // console.log('Accepter: ', a.value);
        let preference = a.preferences.get(p)
        let bestOffer = a.bestOffer && a.preferences.get(a.bestOffer)
        if (!preference) throw new Error('Proposer not rated by accepter'); // Should never be thrown
        if (!bestOffer || (preference.rating < bestOffer.rating)) {
            // console.log('Accepting', p.value);
            if (a.bestOffer) {
                // console.log('jilting', a.bestOffer.value);
                a.bestOffer.capacity += a.capacity;
                pool.push(a.bestOffer);
            }
            a.bestOffer = p;
            p.capacity -= a.capacity;
        }
        if (p.capacity > 0) {
            // console.log('Returning', p.value, 'to the pool');
            pool.push(p);
        }
    }

    return [...accepterPool.values()].map(a => {
        let r = a.result();
        if (!a.bestOffer || !r) return undefined;
        return [a.bestOffer.value, a.value, r.match]
    }).filter(a => a !== undefined) as [P, A, Result][]
}
