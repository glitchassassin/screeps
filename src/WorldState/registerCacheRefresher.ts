export const registerCacheRefresher = (fn: Function) => {
    global.Heap ??= {CacheRefreshers: [], CachePurgers: []}
    global.Heap!.CacheRefreshers.push(fn);
}
