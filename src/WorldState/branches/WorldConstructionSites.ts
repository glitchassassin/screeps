import { asRoomPosition, heapCacheGetter, keyById, memoryCacheGetter } from "screeps-cache";

import { WorldData } from "../WorldData";

export class WorldConstructionSites extends WorldData {
    constructor() {
        super();
        // Reload cached structures
        for (let id of this.ids) {
            let s = new CachedConstructionSite(id as Id<ConstructionSite>)
            this.byId.set(id as Id<ConstructionSite>, s);
            if (s.pos) {
                let room = this.byRoom.get(s.pos.roomName) ?? new Set<CachedConstructionSite>();
                room.add(s);
                this.byRoom.set(s.pos.roomName, room);
            }
        }
    }

    // Set up refresh intervals per room
    public interval = 100;
    public refreshed = new Map<string, number>();

    // Lookup indexes
    public byId = new Map<Id<ConstructionSite>, CachedConstructionSite>();
    public byRoom = new Map<string, Set<CachedConstructionSite>>();

    public update(roomName: string) {
        // If no vision in this room, cancel the update
        if (!Game.rooms[roomName]) return false;
        // If room has been refreshed in the last `interval`, skip it
        let lastRefreshed = this.refreshed.get(roomName);
        if (lastRefreshed && lastRefreshed < this.interval) return false;
        this.refreshed.set(roomName, Game.time);

        let foundIDs = new Set<Id<ConstructionSite>>();
        let room = this.byRoom.get(roomName) ?? new Set<CachedConstructionSite>();
        this.byRoom.set(roomName, room);

        // Refresh existing structures in the room
        Game.rooms[roomName].find(FIND_CONSTRUCTION_SITES).forEach(structure => {
            // Found ID (so we won't clean it up later)
            foundIDs.add(structure.id)

            // Create a new CachedConstructionSite if needed
            if (!this.byId.has(structure.id)) {
                // New structure
                let s = new CachedConstructionSite(structure.id);
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

export class CachedConstructionSite {
    constructor(public id: Id<ConstructionSite>) {
        if (!this.gameObj) throw new Error(`No construction site found for ${this.id}`);
        for (let i in this) {}
    }

    @memoryCacheGetter(keyById, (i: CachedConstructionSite) => Game.getObjectById(i.id)?.pos, asRoomPosition)
    public pos!: RoomPosition;

    @memoryCacheGetter(keyById, (i: CachedConstructionSite) => Game.getObjectById(i.id)?.structureType)
    public structureType!: StructureConstant;

    @heapCacheGetter((i: CachedConstructionSite) => Game.getObjectById(i.id)?.progress)
    public progress?: number;

    @heapCacheGetter((i: CachedConstructionSite) => Game.getObjectById(i.id)?.progressTotal)
    public progressTotal?: number;

    public get gameObj() { return Game.getObjectById(this.id); }
}
