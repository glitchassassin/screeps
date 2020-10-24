import { asRoomPosition, heapCacheGetter, keyById, memoryCacheGetter } from "screeps-cache";

import { WorldData } from "../WorldData";

export class WorldStructures extends WorldData {
    constructor() {
        super();
        // Reload cached structures
        for (let id of this.ids) {
            let s = new CachedStructure(id as Id<Structure>)
            this.byId.set(id as Id<Structure>, s);
            if (s.pos) {
                let room = this.byRoom.get(s.pos.roomName) ?? new Set<CachedStructure>();
                room.add(s);
                this.byRoom.set(s.pos.roomName, room);
            }
        }
    }

    // Set up refresh intervals per room
    public interval = 100;
    public refreshed = new Map<string, number>();

    // Lookup indexes
    public byId = new Map<Id<Structure>, CachedStructure>();
    public byRoom = new Map<string, Set<CachedStructure>>();

    public update(roomName: string) {
        // If no vision in this room, cancel the update
        if (!Game.rooms[roomName]) return false;
        // If room has been refreshed in the last `interval`, skip it
        let lastRefreshed = this.refreshed.get(roomName);
        if (lastRefreshed && lastRefreshed < this.interval) return false;
        this.refreshed.set(roomName, Game.time);

        let foundIDs = new Set<Id<Structure>>();
        let room = this.byRoom.get(roomName) ?? new Set<CachedStructure>();
        this.byRoom.set(roomName, room);

        // Refresh existing structures in the room
        Game.rooms[roomName].find(FIND_STRUCTURES).forEach(structure => {
            console.log(structure);
            // Found ID (so we won't clean it up later)
            foundIDs.add(structure.id)

            // Create a new CachedStructure if needed
            if (!this.byId.has(structure.id)) {
                // New structure
                let s = new CachedStructure(structure.id);
                // Add structure ID to memory
                this.ids.push(structure.id);
                // Update indices
                this.byId.set(structure.id, s);
                room.add(s);
            }

            // Trigger getters to refresh caches
            for (let i in this.byId.get(structure.id) ?? {}) {}
        })
        // Clean up structures that weren't found
        for (let structure of room) {
            if (!foundIDs.has(structure.id)) {
                // Room is visible, but structure does not exist.
                // Remove from indexes
                this.delete(structure.id);
                this.byId.delete(structure.id);
                // Remove cached data for structure
                room.delete(structure);
            }
        }
        return true;
    }
}

export class CachedStructure {
    constructor(public id: Id<Structure>) { }

    @memoryCacheGetter(keyById, (i: CachedStructure) => Game.getObjectById(i.id)?.pos, asRoomPosition)
    public pos?: RoomPosition;

    @memoryCacheGetter(keyById, (i: CachedStructure) => Game.getObjectById(i.id)?.structureType)
    public structureType?: StructureConstant;

    @heapCacheGetter((i: CachedStructure) => Game.getObjectById(i.id)?.hits)
    public hits?: number;

    @heapCacheGetter((i: CachedStructure) => Game.getObjectById(i.id)?.hitsMax)
    public hitsMax?: number;

    public get gameObj() { return Game.getObjectById(this.id); }
}
