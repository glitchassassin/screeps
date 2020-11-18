import { asRoomPosition, heapCacheGetter, keyById, memoryCache, memoryCacheGetter } from "screeps-cache";

import { CachedStructure } from "./WorldStructures";
import { WorldData } from "../WorldData";

export class WorldControllers extends WorldData {
    constructor() {
        super();
        // Reload cached structures
        for (let id of this.ids) {
            try {
                let s = new CachedController(id as Id<StructureController>);
                this.byId.set(id as Id<StructureController>, s);
                this.byRoom.set(s.pos.roomName, s);
            } catch (e) {
                console.log(`Error parsing data for ${this.constructor.name}['${id}']`);
                console.log(e);
            }
        }
        this.ids = Array.from(this.byId.keys());
    }

    // Set up refresh intervals per room
    public interval = 100;
    public refreshed = new Map<string, number>();

    // Lookup indexes
    public byId = new Map<Id<StructureController>, CachedController>();
    public byRoom = new Map<string, CachedController>();
    public byOffice = new Map<string, Set<CachedController>>();

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
            this.byRoom.set(roomName, c);

            let office = global.worldState.rooms.byRoom.get(roomName)?.territoryOf;
            if (office) {
                let officeSet = this.byOffice.get(office) ?? new Set();
                this.byOffice.set(office, officeSet);
                officeSet.add(c);
            }
        }

        // Trigger getters to refresh caches
        for (let i in this.byId.get(controller.id) ?? {}) {}

        return true;
    }
}

export class CachedController extends CachedStructure<StructureController> {
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

    @memoryCacheGetter(keyById, (i: CachedController) => Game.getObjectById(i.id)?.upgradeBlocked ?? 0)
    public upgradeBlocked!: number;

    @memoryCache(keyById, asRoomPosition)
    public containerPos?: RoomPosition;
    @memoryCache(keyById, asRoomPosition)
    public linkPos?: RoomPosition;

    @memoryCacheGetter(keyById, (i: CachedController) => (
        Game.rooms[i.containerPos?.roomName ?? ''] &&
        i.containerPos?.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_CONTAINER)?.id as Id<StructureContainer>|undefined
    ), undefined, id => global.worldState.structures.byId.get(id) === undefined)
    public containerId?: Id<StructureContainer>;
    public get container() { return this.containerId ? global.worldState.structures.byId.get(this.containerId) as CachedStructure<StructureContainer> : undefined }
    @memoryCacheGetter(keyById, (i: CachedController) => (
        Game.rooms[i.linkPos?.roomName ?? ''] &&
        i.linkPos?.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_LINK)?.id as Id<StructureLink>|undefined
    ), undefined, id => global.worldState.structures.byId.get(id) === undefined)
    public linkId?: Id<StructureLink>;
    public get link() { return this.linkId ? global.worldState.structures.byId.get(this.linkId) as CachedStructure<StructureLink> : undefined }

    public get myReserved() { return this.reservationOwner === 'LordGreywether'; }
}
