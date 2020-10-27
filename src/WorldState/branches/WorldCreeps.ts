import { WorldData } from "../WorldData";

export class WorldCreeps extends WorldData {
    constructor() {
        super();
        // Reload cached structures
        for (let name of this.ids) {
            let s = new CachedCreep(name)
            this.byName.set(name, s);
            if (s.pos) {
                let room = this.byRoom.get(s.pos.roomName) ?? new Set<CachedCreep>();
                room.add(s);
                this.byRoom.set(s.pos.roomName, room);
            }
        }
    }

    // Lookup indexes
    public byName = new Map<string, CachedCreep>();
    public byRoom = new Map<string, Set<CachedCreep>>();
    public byOffice = new Map<string, Set<CachedCreep>>();

    public update(roomName: string) {
        // If no vision in this room, cancel the update
        if (!Game.rooms[roomName]) return false;

        let foundIDs = new Set<string>();
        let room = this.byRoom.get(roomName) ?? new Set<CachedCreep>();
        this.byRoom.set(roomName, room);

        // Refresh existing creeps in the room
        Game.rooms[roomName].find(FIND_CREEPS).forEach(creep => {
            // Found ID (so we won't clean it up later)
            foundIDs.add(creep.name)

            // Create a new CachedCreep if needed
            let cachedCreep = this.byName.get(creep.name)
            if (!cachedCreep) {
                // New creep
                cachedCreep = new CachedCreep(creep.name);
                // Add creep ID to memory
                this.ids.push(creep.name);
                // Update indices
                this.byName.set(creep.name, cachedCreep);
                room.add(cachedCreep);
            }
            // Move creep in room index if needed
            else if (!this.byRoom.get(roomName)?.has(cachedCreep)) {
                for (let room of this.byRoom.values()) {
                    room.delete(cachedCreep);
                }
                this.byRoom.get(roomName)?.add(cachedCreep)
            }

            // Add creep to office index if needed
            if (cachedCreep.memory.office) {
                let office = this.byOffice.get(cachedCreep.memory.office) ?? new Set<CachedCreep>();
                office.add(cachedCreep);
                this.byOffice.set(cachedCreep.memory.office, office);
            }

            // Trigger getters to refresh caches
            for (let i in this.byName.get(creep.name) ?? {}) {}
        })
        // Clean up creeps that weren't found
        for (let creep of room) {
            if (!foundIDs.has(creep.name)) {
                // Room is visible, but creep does not exist.
                // Remove from indexes
                this.delete(creep.name);
                // Remove cached data for creep
                room.delete(creep);
            }
        }
        if (Game.time % 50 === 0) {
            // Clean up no-longer-visible creeps
            for (let [name] of this.byName) {
                this.byName.delete(name);
            }
        }
        return true;
    }
}

export class CachedCreep {
    constructor(public name: string) { }

    public get pos() { return Game.creeps[this.name]?.pos; }
    public get my() { return Game.creeps[this.name]?.my; }
    public get hits() { return Game.creeps[this.name]?.hits; }
    public get hitsMax() { return Game.creeps[this.name]?.hitsMax; }
    public get memory() { return Game.creeps[this.name]?.memory; }

    public get gameObj() { return Game.creeps[this.name]; }
}
