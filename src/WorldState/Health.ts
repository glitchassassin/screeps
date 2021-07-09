import { registerCachePurger } from "./registerCachePurger";
import { registerCacheRefresher } from "./registerCacheRefresher";

declare global {
    namespace GreyCompany {
        export type HealthCache = {
            hits: number,
            hitsMax: number
        }
        export interface Heap {
            CacheRefreshers: Function[];
            CachePurgers: Function[];
            Health?: {
                idByRoom: Record<string, Set<string>>;
                data: Record<string, HealthCache>;
            }
        }
    }
    namespace NodeJS {
        interface Global {
            Health: typeof Health
        }
    }
}

/**
 * Fetches data about store health.
 * Only caches data for:
 * - [Heap] Containers in a room not owned by me
 */
export const Health = {
    byId(id: Id<Creep|Structure>|undefined) {
        if (id === undefined) return undefined;
        let obj = Game.getObjectById(id);
        if (!obj) {
            return global.Heap.Health?.data[id];
        }
        return {
            hits: obj?.hits,
            hitsMax: obj?.hitsMax
        }
    },
    purge() {
        global.Heap.Health = {idByRoom: {}, data: {}};
    },
    refreshCache() {
        // Initialize the Heap branch, if necessary
        global.Heap.Health ??= {idByRoom: {}, data: {}};

        for (let roomName in Game.rooms) {
            // Initialize
            global.Heap.Health.idByRoom ??= {};
            let existingIds = new Set(global.Heap.Health.idByRoom[roomName]);
            global.Heap.Health.idByRoom[roomName] = new Set();

            // We only need to cache structure hits, and then only if controller is unowned
            if (!Game.rooms[roomName].controller?.my) {
                for (let structure of Game.rooms[roomName].find(FIND_STRUCTURES).filter(s => !(s instanceof OwnedStructure))) {
                    // Update currently cached IDs
                    global.Heap.Health.idByRoom[roomName].add(structure.id);
                    existingIds.delete(structure.id);

                    global.Heap.Health.data[structure.id] ??= {
                        hits: structure.hits,
                        hitsMax: structure.hitsMax,
                    };
                }
            }

            // Clean up any un-cached IDs
            for (let id of existingIds) {
                delete global.Heap.Health.data[id];
            }
        }
    }
}

global.Health = Health;

// Register the cache refresh
registerCacheRefresher(Health.refreshCache);
registerCachePurger(Health.purge);
