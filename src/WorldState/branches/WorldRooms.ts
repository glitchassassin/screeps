import { keyByName, memoryCache } from "screeps-cache";

import { WorldData } from "../WorldData";

export class WorldRooms extends WorldData {
    constructor() {
        super();
        // Reload cached structures
        console.log('WorldRooms.ids', this.ids);
        console.log('Memory.cache.WorldRooms.ids', Memory.cache.WorldRooms.ids);
        for (let roomName of this.ids) {
            console.log('Reloading data for', roomName);
            let s = new CachedRoom(roomName);
            this.byRoom.set(roomName, s);
        }
    }

    // Lookup indexes
    public byRoom = new Map<string, CachedRoom>();
    public byOffice = new Map<string, Set<CachedRoom>>();

    public update(roomName: string) {
        // If no vision in this room, cancel the update
        if (!Game.rooms[roomName]) return false;

        // Create a new CachedRoom if needed
        let cachedRoom = this.byRoom.get(roomName);
        if (!cachedRoom) {
            // New controller
            cachedRoom = new CachedRoom(roomName);
            // Add controller ID to memory
            this.ids.push(roomName);
            // Update indices
            this.byRoom.set(roomName, cachedRoom)
        }

        // Check if room is near an Office
        if (global.boardroom && !cachedRoom.territoryOf) {
            let office = global.boardroom.getClosestOffice(new RoomPosition(25, 25, cachedRoom.name));
            if (office) {
                let route = Game.map.findRoute(cachedRoom.name, office.name);
                if (route instanceof Array && route.length <= 2) {
                    cachedRoom.territoryOf = office.name;
                }
            }
        }

        if (cachedRoom.territoryOf) {
            let officeSet = this.byOffice.get(cachedRoom.territoryOf) ?? new Set();
            officeSet.add(cachedRoom);
            this.byOffice.set(cachedRoom.territoryOf, officeSet);
        }

        for (let e of cachedRoom.gameObj.getEventLog()) {
            if (e.event === EVENT_ATTACK && e.data.attackType !== EVENT_ATTACK_TYPE_NUKE) {
                let actor = Game.getObjectById(e.objectId as Id<Creep|StructureTower>)
                if (actor && !actor.my) {
                    // Hostiles attacking
                    cachedRoom.lastHostileActivity = Game.time;
                    break;
                }
            } else if (e.event === EVENT_ATTACK_CONTROLLER) {
                let actor = Game.getObjectById(e.objectId as Id<Creep>)
                if (actor && !actor.my) {
                    cachedRoom.lastHostileActivity = Game.time;
                    break;
                }
            }
        }

        // Update scanned timestamp
        cachedRoom.scanned = Game.time;

        return true;
    }
}

export class CachedRoom {
    constructor(public name: string) {
        this.scanned = (this.gameObj) ? Game.time : (this.scanned ?? 0);
    }

    @memoryCache(keyByName)
    public lastHostileActivity?: number;
    @memoryCache(keyByName)
    public scanned!: number;
    @memoryCache(keyByName)
    public city?: string;
    @memoryCache(keyByName)
    public territoryOf?: string;
    @memoryCache(keyByName)
    public roomPlan?: string;

    public get isOffice() { return !!this.city; }

    public get gameObj() { return Game.rooms[this.name]; }
}
