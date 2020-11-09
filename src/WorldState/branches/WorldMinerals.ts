import { CachedIDItem, WorldDataRoomItemsById } from "WorldState/WorldDataRoomItemsById";

import { heapCacheGetter } from "screeps-cache";

export class WorldMinerals extends WorldDataRoomItemsById<Mineral, CachedMineral> {
    public cacheListInMemory = false;

    shouldRefresh() { return true; } // Refresh Sources every tick

    createCachedObject(id: Id<Mineral>) {
        return new CachedMineral(id);
    }

    objectFinder(roomName: string) {
        return Game.rooms[roomName].find(FIND_MINERALS);
    }
}

export class CachedMineral extends CachedIDItem<Mineral> {
    @heapCacheGetter((i: CachedMineral) => Game.getObjectById(i.id)?.density)
    public density?: number;
    @heapCacheGetter((i: CachedMineral) => Game.getObjectById(i.id)?.mineralType)
    public type?: MineralConstant;
    @heapCacheGetter((i: CachedMineral) => Game.getObjectById(i.id)?.mineralAmount)
    public amount?: number;
}
