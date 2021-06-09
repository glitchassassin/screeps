import { packPos, unpackPos } from "utils/packrat";

import { Office } from "Office/Office";
import { registerCachePurger } from "./registerCachePurger";
import { registerCacheRefresher } from "./registerCacheRefresher";

declare global {
    namespace GreyCompany {
        type MineralCache = {
            posPacked: string,
            mineralType: MineralConstant
        }
        interface Heap {
            CacheRefreshers: Function[];
        }
    }
    interface Memory {
        Minerals?: {
            idByRoom: Record<string, Id<Mineral>>;
            data: Record<string, GreyCompany.MineralCache>;
        }
    }
}
export type CachedMineral = Mineral | {
    pos: RoomPosition,
    id: Id<Mineral>,
    mineralType: MineralConstant
}

export class Minerals {
    static byId(id: Id<Mineral>|undefined): CachedMineral|undefined {
        if (id === undefined) return undefined;
        let site = Game.getObjectById(id)
        if (!site) {
            let cached = Memory.Minerals?.data[id]
            if (!cached) return;
            return {
                id: id,
                pos: unpackPos(cached.posPacked),
                mineralType: cached.mineralType
            }
        }
        return site;
    }
    static byRoom(roomName: string): CachedMineral|undefined {
        if (Game.rooms[roomName]) {
            // We have vision here
            return Game.rooms[roomName].find(FIND_MINERALS)[0]
        } else if (!Memory.Minerals) {
            return;
        } else {
            return this.byId(Memory.Minerals.idByRoom[roomName])
        }
    }
    static byOffice(office: Office): CachedMineral[] {
        let mineral = this.byRoom(office.name);
        return mineral ? [mineral] : [];
    }
    static byPos(pos: RoomPosition): CachedMineral[] {
        if (Game.rooms[pos.roomName]) {
            // We have vision here
            return pos.lookFor(LOOK_MINERALS)
        } else if (!Memory.Minerals) {
            return [];
        } else {
            let s = [];
            for (let id in Memory.Minerals.data) {
                let site = this.byId(id as Id<Mineral>)
                if (site?.pos.isEqualTo(pos)) s.push(site);
            }
            return s;
        }
    }
    static purge() {
        Memory.Minerals = {idByRoom: {}, data: {}};
    }
    static refreshCache() {
        // Initialize the Heap branch, if necessary
        Memory.Minerals ??= {idByRoom: {}, data: {}};

        for (let roomName in Game.rooms) {
            // We only need to cache if controller is unowned
            if (!Game.rooms[roomName].controller?.my) {
                for (let site of Game.rooms[roomName].find(FIND_MINERALS)) {
                    // Update currently cached IDs
                    Memory.Minerals.idByRoom[roomName] = site.id;
                    // Cache capacities for each reMineral type
                    Memory.Minerals.data[site.id] ??= {
                        posPacked: packPos(site.pos),
                        mineralType: site.mineralType
                    };
                }
            } else {
                delete Memory.Minerals.idByRoom[roomName];
            }
        }
    }
}

// Register the cache refresh
registerCacheRefresher(Minerals.refreshCache);
registerCachePurger(Minerals.purge);
