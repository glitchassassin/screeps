import { WorldData } from "./WorldData";

class CachedStructure {
    public pos: RoomPosition;
    public id: Id<Structure>;
    public hits: number;
    public hitsMax: number;
    public structureType: StructureConstant;
    constructor(original: Structure|CachedStructure) {
        this.pos = original.pos;
        this.id = original.id;
        this.hits = original.hits;
        this.hitsMax = original.hitsMax;
        this.structureType = original.structureType;
    }
}

declare global {
    interface Memory {
        structures: {[roomName: string]: {[id: string]: CachedStructure}}
    }
}

export class WorldStructures extends WorldData {
    public interval = 100; // Refresh information only every 100 ticks

    public byId = new Map<Id<Structure>, CachedStructure>();
    public byRoom = new Map<string, Map<Id<Structure>, CachedStructure>>();

    public update(roomName: string) {
        if (!Game.rooms[roomName]) return false;
        let foundIDs = new Set<Id<Structure>>();
        Game.rooms[roomName].find(FIND_STRUCTURES).forEach(structure => {
            this.byId.set(structure.id, new CachedStructure(structure));

            let room = this.byRoom.get(roomName) ?? new Map<Id<Structure>, CachedStructure>();
            room.set(structure.id, new CachedStructure(structure))
            this.byRoom.set(roomName, room);

            foundIDs.add(structure.id);
        })
        for (let [id] of this.byId) {
            if (!foundIDs.has(id)) {
                // Room is visible, but structure does not exist
                this.byId.delete(id);
                this.byRoom.get(roomName)?.delete(id);
            }
        }
        return true;
    }
    public cache(roomName: string) {
        let room = this.byRoom.get(roomName);
        if (!room) return false;
        Memory.structures ??= {};
        for (let [id, structure] of room) {
            Memory.structures[roomName][id] = structure;
        }
        return true;
    }
    public getCached(roomName: string) {
        if (!Memory.structures) return false;
        this.byId = new Map<Id<Structure>, CachedStructure>();
        for (let id in Memory.structures[roomName]) {
            this.byId.set(id as Id<Structure>, new CachedStructure(Memory.structures[roomName][id]))

            let room = this.byRoom.get(roomName) ?? new Map<Id<Structure>, CachedStructure>();
            room.set(id as Id<Structure>, new CachedStructure(Memory.structures[roomName][id]))
            this.byRoom.set(roomName, room);
        }
        return true;
    }
}
