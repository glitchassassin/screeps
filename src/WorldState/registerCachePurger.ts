export const registerCachePurger = (fn: Function) => {
    global.Heap ??= {CacheRefreshers: [], CachePurgers: []}
    global.Heap!.CachePurgers.push(fn);
}
