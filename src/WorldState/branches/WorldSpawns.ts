import { CachedStructure } from "./WorldStructures";
import { WorldData } from "../WorldData";

export class WorldSpawns extends WorldData {
    constructor() {
        super();
        // Reload cached structures
        for (let id of this.ids) {
            let s = new CachedSpawn(id as Id<StructureSpawn>)
            this.byId.set(id as Id<StructureSpawn>, s);
            if (s.pos) {
                let room = this.byRoom.get(s.pos.roomName) ?? new Set<CachedSpawn>();
                room.add(s);
                this.byRoom.set(s.pos.roomName, room);
            }
        }
    }

    // Set up refresh intervals per room
    public interval = 100;
    public refreshed = new Map<string, number>();

    // Lookup indexes
    public byId = new Map<Id<StructureSpawn>, CachedSpawn>();
    public byRoom = new Map<string, Set<CachedSpawn>>();

    public update(roomName: string) {
        // If no vision in this room, cancel the update
        if (!Game.rooms[roomName]) return false;
        // If room has been refreshed in the last `interval`, skip it
        let lastRefreshed = this.refreshed.get(roomName);
        if (lastRefreshed && lastRefreshed < this.interval) return false;
        this.refreshed.set(roomName, Game.time);

        let foundIDs = new Set<Id<StructureSpawn>>();
        let room = this.byRoom.get(roomName) ?? new Set<CachedSpawn>();
        this.byRoom.set(roomName, room);

        // Refresh existing structures in the room
        Game.rooms[roomName].find(FIND_MY_SPAWNS).forEach(structure => {
            // Found ID (so we won't clean it up later)
            foundIDs.add(structure.id)

            // Create a new CachedSpawn if needed
            if (!this.byId.has(structure.id)) {
                // New structure
                let s = new CachedSpawn(structure.id);
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

export class CachedSpawn extends CachedStructure<StructureSpawn> {
    constructor(public id: Id<StructureSpawn>) { super(id); }
}
