import { WorldData } from "../WorldData";

export class WorldMyCreeps extends WorldData {
    constructor() {
        super();
        // Reload cached creeps
        for (let name of this.ids) {
            let s = new CachedCreep(name)
            this.byName.set(name, s);
            if (s.memory.office) {
                let room = this.byOffice.get(s.memory.office) ?? new Set<CachedCreep>();
                room.add(s);
                this.byOffice.set(s.memory.office, room);
            }
        }
    }

    // Lookup indexes
    public byName = new Map<string, CachedCreep>();
    public byOffice = new Map<string, Set<CachedCreep>>();

    public scanned = 0;

    public update(roomName: string) {
        // Actually updating globally, not room by room
        if (this.scanned === Game.time) return false;
        this.scanned = Game.time;

        // Refresh existing creeps in the room
        for (let creepName in Game.creeps) {
            let creep = Game.creeps[creepName];
            // if (creep.spawning) continue; // Skip still-spawning creeps

            // Create a new CachedCreep if needed
            let cachedCreep = this.byName.get(creep.name)
            if (!cachedCreep) {
                // New creep
                cachedCreep = new CachedCreep(creep.name);
                // Add creep ID to memory
                this.ids.push(creep.name);
                // Update indices
                this.byName.set(creep.name, cachedCreep);
            }

            // Add creep to office index if needed
            if (cachedCreep.memory.office) {
                let office = this.byOffice.get(cachedCreep.memory.office) ?? new Set<CachedCreep>();
                office.add(cachedCreep);
                this.byOffice.set(cachedCreep.memory.office, office);
            }

            // Trigger getters to refresh caches
            for (let i in this.byName.get(creep.name) ?? {}) {}
        }
        // Clean up no-longer-visible creeps
        for (let [name, creep] of this.byName) {
            if (!creep.gameObj) {
                this.byName.delete(name);
                for (let [,office] of this.byOffice) {
                    office.delete(creep)
                }
            }
        }
        return true;
    }
}

export class CachedCreep {
    constructor(public name: string) {
        if (!this.gameObj) throw new Error('Unable to create CachedCreep: no creep with name found')
    }

    public get pos() { return Game.creeps[this.name]?.pos; }
    public get my() { return Game.creeps[this.name]?.my; }
    public get hits() { return Game.creeps[this.name]?.hits; }
    public get hitsMax() { return Game.creeps[this.name]?.hitsMax; }
    public get memory() { return Game.creeps[this.name]?.memory; }

    public get capacity() {return Game.creeps[this.name]?.store.getCapacity()}
    public get capacityUsed() {return Game.creeps[this.name]?.store.getUsedCapacity()}
    public get capacityFree() {return Game.creeps[this.name]?.store.getFreeCapacity()}

    public get gameObj() { return Game.creeps[this.name]; }
}
