import { CachedIDItem, WorldDataRoomItemsById } from "WorldState/WorldDataRoomItemsById";

import { heapCacheGetter } from "screeps-cache";

export class WorldTombstones extends WorldDataRoomItemsById<Tombstone, CachedTombstone> {
    public cacheListInMemory = false;

    shouldRefresh() { return true; } // Refresh tombstones every tick

    createCachedObject(id: Id<Tombstone>) {
        return new CachedTombstone(id);
    }

    objectFinder(roomName: string) {
        return Game.rooms[roomName].find(FIND_TOMBSTONES);
    }
}

export class CachedTombstone extends CachedIDItem<Tombstone> {
    @heapCacheGetter((i: CachedTombstone) => (Game.getObjectById(i.id)?.store as GenericStore)?.getCapacity() ?? 0)
    public capacity: number = 0;

    @heapCacheGetter((i: CachedTombstone) => (Game.getObjectById(i.id)?.store as GenericStore)?.getUsedCapacity() ?? 0)
    public capacityUsed: number = 0;

    @heapCacheGetter((i: CachedTombstone) => (Game.getObjectById(i.id)?.store as GenericStore)?.getFreeCapacity() ?? 0)
    public capacityFree: number = 0;
}
