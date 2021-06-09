import { packPos, unpackPos } from "utils/packrat";

import { Office } from "Office/Office";
import { registerCacheRefresher } from "./registerCacheRefresher";

declare global {
    namespace GreyCompany {
        type StructureCache = {
            structureType: StructureConstant,
            posPacked: string,
            my: boolean
        }
        interface Heap {
            CacheRefreshers: Function[];
        }
    }
    interface Memory {
        Structures?: {
            idByRoom: Record<string, Id<Structure>[]>;
            data: Record<string, GreyCompany.StructureCache>;
        }
    }
}
export type CachedStructure<T extends Structure = Structure> = T | {
    pos: RoomPosition,
    id: Id<T>,
    structureType: StructureConstant,
    my: boolean
}

export function unwrapStructure(structure: CachedStructure): CachedStructure {
    return {
        pos: structure.pos,
        id: structure.id,
        structureType: structure.structureType,
        my: ('my' in structure) ? structure.my : false
    }
}

export class Structures {
    static byId<T extends Structure = Structure>(id: Id<T>|undefined): CachedStructure<T>|undefined {
        if (id === undefined) return undefined;
        let site = Game.getObjectById(id)
        if (!site) {
            let cached = Memory.Structures?.data[id]
            if (!cached) return;
            return {
                id: id,
                structureType: cached.structureType,
                pos: unpackPos(cached.posPacked),
                my: cached.my
            }
        }
        return site;
    }
    static byRoom(roomName: string): CachedStructure[] {
        if (Game.rooms[roomName]) {
            // We have vision here
            return Game.rooms[roomName].find(FIND_STRUCTURES)
        } else if (!Memory.Structures) {
            return [];
        } else {
            return Memory.Structures.idByRoom[roomName]
                ?.map(id => Structures.byId(id))
                .filter(site => site !== undefined) as CachedStructure[] ?? []
        }
    }
    static byOffice(office: Office): CachedStructure[] {
        return this.byRoom(office.name);
    }
    static byPos(pos: RoomPosition): CachedStructure[] {
        if (Game.rooms[pos.roomName]) {
            // We have vision here
            return pos.lookFor(LOOK_STRUCTURES)
        } else if (!Memory.Structures) {
            return [];
        } else {
            let s = [];
            for (let id in Memory.Structures.data) {
                let site = Structures.byId(id as Id<Structure>)
                if (site?.pos.isEqualTo(pos)) s.push(site);
            }
            return s;
        }
    }
    static refreshCache() {
        // Initialize the Heap branch, if necessary
        global.Heap ??= {CacheRefreshers: []}
        Memory.Structures ??= {idByRoom: {}, data: {}};

        for (let roomName in Game.rooms) {
            // Initialize
            Memory.Structures.idByRoom ??= {};
            let existingIds = new Set(Memory.Structures.idByRoom[roomName]);
            Memory.Structures.idByRoom[roomName] = [];

            // We only need to cache if controller is unowned
            if (!Game.rooms[roomName].controller?.my) {
                for (let site of Game.rooms[roomName].find(FIND_STRUCTURES)) {
                    // Update currently cached IDs
                    Memory.Structures.idByRoom[roomName].push(site.id);
                    existingIds.delete(site.id);
                    // Cache capacities for each resource type
                    Memory.Structures.data[site.id] ??= {
                        structureType: site.structureType,
                        posPacked: packPos(site.pos),
                        my: (site instanceof OwnedStructure) ? site.my : false
                    };
                }
            }

            // Clean up any un-cached IDs
            for (let id of existingIds) {
                delete Memory.Structures.data[id];
            }
        }
    }
}

// Register the cache refresh
registerCacheRefresher(Structures.refreshCache);
