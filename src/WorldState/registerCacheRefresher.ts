export const registerCacheRefresher = (fn: Function) => {
    global.Heap ??= {CacheRefreshers: []}
    global.Heap!.CacheRefreshers.push(fn);
}
