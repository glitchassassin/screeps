import { packPos, unpackPos } from "utils/packrat";

import { Office } from "Office/Office";
import { RoomData } from "./Rooms";
import profiler from "screeps-profiler";
import { registerCachePurger } from "./registerCachePurger";
import { registerCacheRefresher } from "./registerCacheRefresher";

declare global {
    namespace GreyCompany {
        type ConstructionSiteCache = {
            structureType: BuildableStructureConstant,
            posPacked: string,
            progress: number
        }
        interface Heap {
            CacheRefreshers: Function[];
        }
    }
    interface Memory {
        ConstructionSites?: {
            idByRoom: Record<string, Id<ConstructionSite>[]>;
            data: Record<string, GreyCompany.ConstructionSiteCache>;
        }
    }
}
export type CachedConstructionSite = ConstructionSite | {
    pos: RoomPosition,
    id: Id<ConstructionSite>,
    structureType: BuildableStructureConstant,
    progress: number,
    progressTotal: number
}

export function unwrapConstructionSite(site: CachedConstructionSite): CachedConstructionSite {
    return {
        pos: site.pos,
        id: site.id,
        structureType: site.structureType,
        progress: site.progress,
        progressTotal: site.progressTotal,
    }
}

export const ConstructionSites = {
    byId(id: Id<ConstructionSite>|undefined): CachedConstructionSite|undefined {
        if (id === undefined) return undefined;
        let site = Game.getObjectById(id)
        if (!site) {
            let cached = Memory.ConstructionSites?.data[id]
            if (!cached) return;
            const cachedSite = {
                id: id,
                structureType: cached.structureType,
                pos: unpackPos(cached.posPacked),
                progress: cached.progress,
                progressTotal: CONSTRUCTION_COST[cached.structureType]
            }

            // Check if cache is stale
            if (Game.rooms[cachedSite.pos.roomName]) {
                // Site should have been visible, must be gone
                delete Memory.ConstructionSites?.data[id]
                return undefined;
            } else {
                return cachedSite
            }
        }
        return site;
    },
    byRoom(roomName: string): CachedConstructionSite[] {
        if (Game.rooms[roomName]) {
            // We have vision here
            return Game.rooms[roomName].find(FIND_MY_CONSTRUCTION_SITES)
        } else if (!Memory.ConstructionSites) {
            return [];
        } else {
            return Memory.ConstructionSites.idByRoom[roomName]
                ?.map(id => ConstructionSites.byId(id))
                .filter(site => site !== undefined) as CachedConstructionSite[] ?? []
        }
    },
    byOffice(office: Office): CachedConstructionSite[] {
        return RoomData.byOffice(office).flatMap(r => this.byRoom(r.name));
    },
    byPos(pos: RoomPosition): CachedConstructionSite|undefined {
        return ConstructionSites.byRoom(pos.roomName).find(site => site?.pos.isEqualTo(pos));
    },
    purge() {
        Memory.ConstructionSites = {idByRoom: {}, data: {}};
    },
    refreshCache() {
        // Initialize the Heap branch, if necessary
        Memory.ConstructionSites ??= {idByRoom: {}, data: {}};

        for (let roomName in Game.rooms) {
            // Initialize
            Memory.ConstructionSites.idByRoom ??= {};
            let existingIds = new Set(Memory.ConstructionSites.idByRoom[roomName]);
            Memory.ConstructionSites.idByRoom[roomName] = [];

            // We only need to cache if controller is unowned
            if (!Game.rooms[roomName].controller?.my) {
                for (let site of Game.rooms[roomName].find(FIND_MY_CONSTRUCTION_SITES)) {
                    // Update currently cached IDs
                    Memory.ConstructionSites.idByRoom[roomName].push(site.id);
                    existingIds.delete(site.id);
                    // Cache capacities for each resource type
                    Memory.ConstructionSites.data[site.id] ??= {
                        structureType: site.structureType,
                        posPacked: packPos(site.pos),
                        progress: site.progress
                    };
                }
            }

            // Clean up any un-cached IDs
            for (let id of existingIds) {
                delete Memory.ConstructionSites.data[id];
            }
        }
    }
}

// Register the cache refresh
registerCacheRefresher(ConstructionSites.refreshCache);
registerCachePurger(ConstructionSites.purge);

profiler.registerObject(ConstructionSites, 'ConstructionSites');
