import { CachedIDItem, WorldDataRoomItemsById } from "WorldState/WorldDataRoomItemsById";

import { heapCacheGetter } from "screeps-cache";

export class WorldResources extends WorldDataRoomItemsById<Resource, CachedResource> {
    public cacheListInMemory = false;

    shouldRefresh() { return true; } // Refresh Resources every tick

    createCachedObject(id: Id<Resource>) {
        return new CachedResource(id);
    }

    objectFinder(roomName: string) {
        return Game.rooms[roomName].find(FIND_DROPPED_RESOURCES);
    }
}

export class CachedResource<T extends ResourceConstant = ResourceConstant> extends CachedIDItem<Resource> {
    @heapCacheGetter((i: CachedResource) => Game.getObjectById(i.id)?.amount ?? 0)
    public amount: number = 0;

    @heapCacheGetter((i: CachedResource) => Game.getObjectById(i.id)?.resourceType)
    public resourceType?: T;
}
