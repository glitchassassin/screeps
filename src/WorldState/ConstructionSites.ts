import { packPos, unpackPos } from "utils/packrat";

import { Office } from "Office/Office";
import { RoomData } from "./Rooms";
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

export class ConstructionSites {
    static byId(id: Id<ConstructionSite>|undefined): CachedConstructionSite|undefined {
        if (id === undefined) return undefined;
        let site = Game.getObjectById(id)
        if (!site) {
            let cached = Memory.ConstructionSites?.data[id]
            if (!cached) return;
            return {
                id: id,
                structureType: cached.structureType,
                pos: unpackPos(cached.posPacked),
                progress: cached.progress,
                progressTotal: CONSTRUCTION_COST[cached.structureType]
            }
        }
        return site;
    }
    static byRoom(roomName: string): CachedConstructionSite[] {
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
    }
    static byOffice(office: Office): CachedConstructionSite[] {
        return RoomData.byOffice(office).flatMap(r => this.byRoom(r.name));
    }
    static byPos(pos: RoomPosition): CachedConstructionSite|undefined {
        if (Game.rooms[pos.roomName]) {
            // We have vision here
            return pos.lookFor(LOOK_CONSTRUCTION_SITES).find(c => c.my)
        } else if (!Memory.ConstructionSites) {
            return;
        } else {
            for (let id in Memory.ConstructionSites.data) {
                let site = ConstructionSites.byId(id as Id<ConstructionSite>)
                if (site?.pos.isEqualTo(pos)) return site;
            }
            return;
        }
    }
    static purge() {
        Memory.ConstructionSites = {idByRoom: {}, data: {}};
    }
    static refreshCache() {
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
