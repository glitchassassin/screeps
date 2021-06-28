import { packPos, unpackPos } from "utils/packrat";

import { Office } from "Office/Office";
import { RoomData } from "./Rooms";
import profiler from "screeps-profiler";
import { registerCachePurger } from "./registerCachePurger";
import { registerCacheRefresher } from "./registerCacheRefresher";

declare global {
    namespace GreyCompany {
        type SourceCache = {
            posPacked: string,
        }
        interface Heap {
            CacheRefreshers: Function[];
        }
    }
    interface Memory {
        Sources?: {
            idByRoom: Record<string, Id<Source>[]>;
            data: Record<string, GreyCompany.SourceCache>;
        }
    }
}
export type CachedSource = Source | {
    pos: RoomPosition,
    id: Id<Source>
}

export class Sources {
    static byId(id: Id<Source>|undefined): CachedSource|undefined {
        if (id === undefined) return undefined;
        let site = Game.getObjectById(id)
        if (!site) {
            let cached = Memory.Sources?.data[id]
            if (!cached) return;
            return {
                id: id,
                pos: unpackPos(cached.posPacked),
            }
        }
        return site;
    }
    static byRoom(roomName: string): CachedSource[] {
        if (Game.rooms[roomName]) {
            // We have vision here
            return Game.rooms[roomName].find(FIND_SOURCES)
        } else if (!Memory.Sources) {
            return [];
        } else {
            return Memory.Sources.idByRoom[roomName]
                ?.map(id => this.byId(id))
                .filter(site => site !== undefined) as CachedSource[] ?? []
        }
    }
    static byOffice(office: Office): CachedSource[] {
        return RoomData.byOffice(office).flatMap(r => this.byRoom(r.name));
    }
    static byPos(pos: RoomPosition): CachedSource[] {
        return Sources.byRoom(pos.roomName).filter(site => site?.pos.isEqualTo(pos));
    }
    static purge() {
        Memory.Sources = {idByRoom: {}, data: {}};
    }
    static refreshCache() {
        // Initialize the Heap branch, if necessary
        Memory.Sources ??= {idByRoom: {}, data: {}};

        for (let roomName in Game.rooms) {
            // Initialize
            Memory.Sources.idByRoom[roomName] = [];

            // We only need to cache if controller is unowned
            if (!Game.rooms[roomName].controller?.my) {
                for (let site of Game.rooms[roomName].find(FIND_SOURCES)) {
                    // Update currently cached IDs
                    Memory.Sources.idByRoom[roomName].push(site.id);
                    // Cache capacities for each resource type
                    Memory.Sources.data[site.id] ??= {
                        posPacked: packPos(site.pos),
                    };
                }
            } else {
                // If room becomes owned, we can remove those from cache
                for (let id of Memory.Sources.idByRoom[roomName]) {
                    delete Memory.Sources.data[id];
                }
                delete Memory.Sources.idByRoom[roomName];
            }
        }
    }
}

// Register the cache refresh
registerCacheRefresher(Sources.refreshCache);
registerCachePurger(Sources.purge);

profiler.registerClass(Sources, 'Sources');
