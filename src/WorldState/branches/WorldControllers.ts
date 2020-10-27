import { asRoomPosition, heapCacheGetter, keyById, memoryCache, memoryCacheGetter } from "screeps-cache";

import { WorldData } from "../WorldData";

export class WorldControllers extends WorldData {
    constructor() {
        super();
        // Reload cached structures
        for (let id of this.ids) {
            let s = new CachedController(id as Id<StructureController>);
            this.byId.set(id as Id<StructureController>, s);
            this.byRoom.set(s.pos.roomName, s);
        }
    }

    // Set up refresh intervals per room
    public interval = 100;
    public refreshed = new Map<string, number>();

    // Lookup indexes
    public byId = new Map<Id<StructureController>, CachedController>();
    public byRoom = new Map<string, CachedController>();

    public update(roomName: string) {
        // If no vision in this room, cancel the update
        let controller = Game.rooms[roomName]?.controller;
        if (!controller) return false;
        // If room has been refreshed in the last `interval`, skip it
        let lastRefreshed = this.refreshed.get(roomName);
        if (lastRefreshed && lastRefreshed < this.interval) return false;
        this.refreshed.set(roomName, Game.time);

        // Create a new CachedController if needed
        if (!this.byId.has(controller.id)) {
            // New controller
            let c = new CachedController(controller.id);
            // Add controller ID to memory
            this.ids.push(controller.id);
            // Update indices
            this.byId.set(controller.id, c);
            this.byRoom.set(roomName, c)
        }

        // Trigger getters to refresh caches
        for (let i in this.byId.get(controller.id) ?? {}) {}

        return true;
    }
}

export class CachedController {
    constructor(public id: Id<StructureController>) {
        for (let i in this) {}
    }

    @memoryCacheGetter(keyById, (i: CachedController) => Game.getObjectById(i.id)?.pos, asRoomPosition)
    public pos!: RoomPosition;

    @memoryCacheGetter(keyById, (i: CachedController) => Game.getObjectById(i.id)?.level)
    public level!: number;

    @heapCacheGetter((i: CachedController) => Game.getObjectById(i.id)?.progress)
    public progress?: number;

    @heapCacheGetter((i: CachedController) => Game.getObjectById(i.id)?.progressTotal)
    public progressTotal?: number;

    @memoryCacheGetter(keyById, (i: CachedController) => Game.getObjectById(i.id)?.owner)
    public owner!: string;

    @memoryCacheGetter(keyById, (i: CachedController) => Game.getObjectById(i.id)?.reservation?.username)
    public reservationOwner!: string;

    @memoryCacheGetter(keyById, (i: CachedController) => Game.getObjectById(i.id)?.reservation?.ticksToEnd)
    public reservationDuration!: number;

    @memoryCacheGetter(keyById, (i: CachedController) => Game.getObjectById(i.id)?.upgradeBlocked)
    public upgradeBlocked!: number;

    @memoryCache(keyById, asRoomPosition)
    public containerPos?: RoomPosition;

    @memoryCache(keyById)
    public containerId?: Id<StructureContainer>;

    @memoryCache(keyById)
    public containerConstructionSiteId?: Id<ConstructionSite>;

    public get my() { return this.owner === 'LordGreywether'; }

    public get myReserved() { return this.reservationOwner === 'LordGreywether'; }

    public get gameObj() { return Game.getObjectById(this.id); }
}
