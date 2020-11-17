import { asRoomPosition, keyById, memoryCacheGetter } from "screeps-cache";

import { WorldData } from "./WorldData";

export class CachedIDItem<T extends RoomObject & _HasId & _HasRoomPosition> {
    constructor(public id: Id<T>) {
        // Refresh item properties
        for (let i in this) {}
    }

    @memoryCacheGetter(keyById, (i: CachedIDItem<T>) => Game.getObjectById(i.id)?.pos, asRoomPosition)
    public pos!: RoomPosition;

    public _scanned: number = Game.time;
    @memoryCacheGetter(keyById, (i: CachedIDItem<T>) => {
        if (i.gameObj) { i._scanned = Game.time; }
        return i._scanned;
    })
    public scanned!: number

    public get gameObj() { return Game.getObjectById(this.id); }
}

export abstract class WorldDataRoomItemsById<T extends RoomObject & _HasId & _HasRoomPosition, C extends CachedIDItem<T>> extends WorldData {
    public abstract shouldRefresh(roomName: string): boolean;
    public abstract objectFinder(roomName: string): T[];
    public abstract createCachedObject(id: Id<T>): C;
    public cacheListInMemory = true;

    constructor() {
        super();
        // Reload cached structures
        if (this.cacheListInMemory) {
            for (let id of this.ids) {
                let s = this.createCachedObject(id as Id<T>);
                this.byId.set(id as Id<T>, s);

                let room = this.byRoom.get(s.pos.roomName) ?? new Set<C>();
                room.add(s);
                this.byRoom.set(s.pos.roomName, room);

                let office = global.worldState?.rooms.byRoom.get(s.pos.roomName)?.territoryOf;
                if (office) {
                    let officeSet = this.byOffice.get(s.pos.roomName) ?? new Set<C>();
                    officeSet.add(s);
                    this.byOffice.set(s.pos.roomName, officeSet);
                }
            }
        }
    }

    // Lookup indexes
    public byId = new Map<Id<T>, C>();
    public byRoom = new Map<string, Set<C>>();
    public byOffice = new Map<string, Set<C>>();

    public update(roomName: string) {
        // If no vision in this room, cancel the update
        if (!Game.rooms[roomName]) return false;
        // If room does not need to be refreshed, cancel the update
        if (!this.shouldRefresh(roomName)) return false;

        let foundIDs = new Set<Id<T>>();
        let room = this.byRoom.get(roomName) ?? new Set<C>();
        this.byRoom.set(roomName, room);

        let office = global.worldState.rooms.byRoom.get(roomName)?.territoryOf;
        let officeSet = office ? this.byOffice.get(office) ?? new Set<C>() : undefined;
        if (office && officeSet) this.byOffice.set(office, officeSet);

        // Refresh existing structures in the room
        this.objectFinder(roomName).forEach(obj => {
            // Found ID (so we won't clean it up later)
            foundIDs.add(obj.id)

            // Create a new cached object if needed
            if (!this.byId.has(obj.id)) {
                // New structure
                let s = this.createCachedObject(obj.id);
                // Add structure ID to memory
                this.ids.push(obj.id);
                // Update indices
                this.byId.set(obj.id, s);
                room.add(s);
                officeSet?.add(s);
            }

            // Trigger getters to refresh caches
            for (let i in this.byId.get(obj.id) ?? {}) {}
        })
        // Clean up objects that weren't found
        for (let obj of room) {
            if (!foundIDs.has(obj.id)) {
                // Room is visible, but structure does not exist.
                // Remove from indexes
                this.delete(obj.id);
                this.byId.delete(obj.id);
                // Remove cached data for structure
                room.delete(obj);
                officeSet?.delete(obj);
            }
        }
        return true;
    }
}
