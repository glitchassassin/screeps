import { CachedIDItem } from "WorldState/WorldDataRoomItemsById";
import { WorldData } from "../WorldData";

export class WorldHostileCreeps extends WorldData {
    constructor() {
        super();
        // Reload cached creeps
        for (let id of this.ids) {
            let s = new CachedHostileCreep(id as Id<Creep>)
            this.byId.set(id as Id<Creep>, s);
            if (s.pos) {
                let room = this.byRoom.get(s.pos.roomName) ?? new Set<CachedHostileCreep>();
                room.add(s);
                this.byRoom.set(s.pos.roomName, room);
            }
        }
    }

    // Lookup indexes
    public byId = new Map<Id<Creep>, CachedHostileCreep>();
    public byRoom = new Map<string, Set<CachedHostileCreep>>();

    public update(roomName: string) {
        // If no vision in this room, cancel the update
        if (!Game.rooms[roomName]) return false;

        let foundIDs = new Set<string>();
        let room = this.byRoom.get(roomName) ?? new Set<CachedHostileCreep>();
        this.byRoom.set(roomName, room);

        // Refresh existing creeps in the room
        Game.rooms[roomName].find(FIND_HOSTILE_CREEPS).forEach(creep => {
            // Found ID (so we won't clean it up later)
            foundIDs.add(creep.id)

            // Create a new CachedHostileCreep if needed
            let cachedHostileCreep = this.byId.get(creep.id)
            if (!cachedHostileCreep) {
                // New creep
                cachedHostileCreep = new CachedHostileCreep(creep.id);
                // Add creep ID to memory
                this.ids.push(creep.id);
                // Update indices
                this.byId.set(creep.id, cachedHostileCreep);
                room.add(cachedHostileCreep);
            }
            // Move creep in room index if needed
            else if (!this.byRoom.get(roomName)?.has(cachedHostileCreep)) {
                for (let r of this.byRoom.values()) {
                    r.delete(cachedHostileCreep);
                }
                this.byRoom.get(roomName)?.add(cachedHostileCreep)
            }

            // Trigger getters to refresh caches
            for (let i in this.byId.get(creep.id) ?? {}) {}
        })
        // Clean up creeps that weren't found
        for (let creep of room) {
            if (!foundIDs.has(creep.id)) {
                // Room is visible, but creep does not exist.
                // Remove from indexes
                this.delete(creep.id);
                // Remove cached data for creep
                room.delete(creep);
            }
        }
        if (Game.time % 50 === 0) {
            // Clean up no-longer-visible creeps
            for (let [id] of this.byId) {
                if (!Game.getObjectById(id)) {
                    this.byId.delete(id);
                }
            }
        }
        return true;
    }
}

export class CachedHostileCreep extends CachedIDItem<Creep> {
    public get my() { return Game.getObjectById(this.id)?.my; }
    public get hits() { return Game.getObjectById(this.id)?.hits; }
    public get hitsMax() { return Game.getObjectById(this.id)?.hitsMax; }
}
