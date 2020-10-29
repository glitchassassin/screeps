export function* lazyMap<T>(i: Iterable<T>, fn: (i: T) => any) {
    for (let element of i) {
        yield fn(element);
    }
}

export function* lazyFilter<T>(i: Iterable<T>, fn: (i: T) => any) {
    for (let element of i) {
        if (fn(element)) {
            yield element;
        }
    }
}
