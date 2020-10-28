import { CachedIDItem, WorldDataRoomItemsById } from "WorldState/WorldDataRoomItemsById";
import { heapCacheGetter, keyById, memoryCacheGetter } from "screeps-cache";

export class WorldStructures extends WorldDataRoomItemsById<Structure, CachedStructure> {
    createCachedObject(id: Id<Structure>) {
        return new CachedStructure(id);
    }

    objectFinder(roomName: string) {
        return Game.rooms[roomName].find(FIND_STRUCTURES);
    }

    // Set up refresh intervals per room
    public interval = 100;
    public refreshed = new Map<string, number>();
    shouldRefresh(roomName: string) {
        // If room has been refreshed in the last `interval`, skip it
        let lastRefreshed = this.refreshed.get(roomName);
        if (lastRefreshed && lastRefreshed < this.interval) return false;
        this.refreshed.set(roomName, Game.time);
        return true;
    }
}

export class CachedStructure<T extends Structure = Structure> extends CachedIDItem<T> {
    @memoryCacheGetter(keyById, (i: CachedStructure<T>) => Game.getObjectById(i.id)?.structureType)
    public structureType!: StructureConstant;

    @memoryCacheGetter(keyById, (i: CachedStructure<T>) => {
        let o = Game.getObjectById(i.id)
        return (o instanceof OwnedStructure) ? o.my : false
    })
    public my!: boolean;

    @heapCacheGetter((i: CachedStructure<T>) => Game.getObjectById(i.id)?.hits)
    public hits?: number;

    @heapCacheGetter((i: CachedStructure<T>) => Game.getObjectById(i.id)?.hitsMax)
    public hitsMax?: number;

    @heapCacheGetter((i: CachedStructure<AnyStoreStructure>) => (Game.getObjectById(i.id)?.store as GenericStore)?.getCapacity() ?? 0)
    public capacity: number = 0;

    @heapCacheGetter((i: CachedStructure<AnyStoreStructure>) => (Game.getObjectById(i.id)?.store as GenericStore)?.getUsedCapacity() ?? 0)
    public capacityUsed: number = 0;

    @heapCacheGetter((i: CachedStructure<AnyStoreStructure>) => (Game.getObjectById(i.id)?.store as GenericStore)?.getFreeCapacity() ?? 0)
    public capacityFree: number = 0;
}
