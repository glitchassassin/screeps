import { CachedIDItem, WorldDataRoomItemsById } from "WorldState/WorldDataRoomItemsById";
import { heapCacheGetter, keyById, memoryCacheGetter } from "screeps-cache";

export class WorldConstructionSites extends WorldDataRoomItemsById<ConstructionSite, CachedConstructionSite> {
    createCachedObject(id: Id<ConstructionSite>) {
        return new CachedConstructionSite(id);
    }

    objectFinder(roomName: string) {
        return Game.rooms[roomName].find(FIND_MY_CONSTRUCTION_SITES);
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

export class CachedConstructionSite extends CachedIDItem<ConstructionSite> {
    @memoryCacheGetter(keyById, (i: CachedConstructionSite) => Game.getObjectById(i.id)?.structureType)
    public structureType!: StructureConstant;

    @heapCacheGetter((i: CachedConstructionSite) => Game.getObjectById(i.id)?.progress)
    public progress?: number;

    @heapCacheGetter((i: CachedConstructionSite) => Game.getObjectById(i.id)?.progressTotal)
    public progressTotal?: number;
}
