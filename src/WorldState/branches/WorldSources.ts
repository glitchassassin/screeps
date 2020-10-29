import { CachedIDItem, WorldDataRoomItemsById } from "WorldState/WorldDataRoomItemsById";
import { asRoomPosition, heapCacheGetter, keyById, memoryCache, memoryCacheGetter } from "screeps-cache";

import { countEnergyInContainersOrGround } from "utils/gameObjectSelectors";
import { lazyFilter } from "utils/lazyIterators";

export class WorldSources extends WorldDataRoomItemsById<Source, CachedSource> {
    public cacheListInMemory = false;

    shouldRefresh() { return true; } // Refresh Sources every tick

    createCachedObject(id: Id<Source>) {
        return new CachedSource(id);
    }

    objectFinder(roomName: string) {
        return Game.rooms[roomName].find(FIND_SOURCES);
    }
}

export class CachedSource extends CachedIDItem<Source> {
    @heapCacheGetter((i: CachedSource) => Game.getObjectById(i.id)?.energy)
    public energy?: number;
    @heapCacheGetter((i: CachedSource) => Game.getObjectById(i.id)?.energyCapacity)
    public energyCapacity?: number;

    @memoryCache(keyById, asRoomPosition)
    public franchisePos?: RoomPosition;

    @memoryCache(keyById)
    public officeId?: string;
    @memoryCacheGetter(keyById, (i: CachedSource) => Game.rooms[i.franchisePos?.roomName ?? ''] && i.franchisePos?.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_CONTAINER)?.id as Id<StructureContainer>|undefined)
    public containerId?: Id<StructureContainer>;
    public get container() { return this.containerId ? global.worldState.structures.byId.get(this.containerId) : undefined }
    @memoryCacheGetter(keyById, (i: CachedSource) => Game.rooms[i.franchisePos?.roomName ?? ''] && i.franchisePos?.lookFor(LOOK_CONSTRUCTION_SITES).find(s => s.structureType === STRUCTURE_CONTAINER)?.id as Id<ConstructionSite>|undefined)
    public constructionSiteId?: Id<ConstructionSite>;
    public get constructionSite() { return this.constructionSiteId ? global.worldState.constructionSites.byId.get(this.constructionSiteId) : undefined }

    @heapCacheGetter((i: CachedSource) => countEnergyInContainersOrGround(i.pos))
    public surplus?: number;

    public get salesmen() {
        if (!this.officeId) return [];
        return Array.from(lazyFilter(
            global.worldState.myCreeps.byOffice.get(this.officeId) ?? [],
            creep => creep.memory.source === this.id
        ))
    }
    public maxSalesmen: number = 1;
}
