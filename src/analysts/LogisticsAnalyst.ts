import { Memoize } from "typescript-memoize";
import { Analyst } from "./Analyst";

export class LogisticsAnalyst extends Analyst {
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getContainers(room: Room) {
        return room.find(FIND_STRUCTURES)
            .filter(s => s.structureType === STRUCTURE_CONTAINER) as StructureContainer[];
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getStorage(room: Room) {
        return room.find(FIND_STRUCTURES)
            .filter(s => s.structureType === STRUCTURE_STORAGE) as StructureStorage[];
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getOutputContainers(room: Room) {
        return this.getContainers(room).filter(s => !global.analysts.source.isMineContainer(s));
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getTombstones(room: Room) {
        return room.find(FIND_TOMBSTONES);
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getFreeEnergy(room: Room) {
        return room.find(FIND_DROPPED_RESOURCES).filter(r => r.resourceType === RESOURCE_ENERGY) as Resource<RESOURCE_ENERGY>[];
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getMostEmptyContainer(room: Room): StructureContainer|null {
        let container: StructureContainer|null = null;
        this.getContainers(room).forEach(c => {
            if (!container || c.store[RESOURCE_ENERGY] < container.store[RESOURCE_ENERGY]) {
                container = c;
            }
        })
        return container;
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getMostFullContainer(room: Room): StructureContainer|null {
        let container: StructureContainer|null = null;
        this.getContainers(room).forEach(c => {
            if (!container || c.store[RESOURCE_ENERGY] > container.store[RESOURCE_ENERGY]) {
                container = c;
            }
        })
        return container;
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getAllSources(room: Room): (AnyStoreStructure|Tombstone)[] {
        let c = [...this.getStorage(room), ...this.getContainers(room), ...this.getTombstones(room)];
        if (c.length !== 0) return c;
        return room.find(FIND_MY_SPAWNS) as StructureSpawn[];
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getHaulers(room: Room): (Creep)[] {
        return room.find(FIND_MY_CREEPS).filter(c => c.memory.type === 'HAULER');
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getMostEmptyAllSources(room: Room) {
        let container: AnyStoreStructure|Tombstone|null = null;
        this.getAllSources(room).forEach((c) => {
            if (!container || c.store[RESOURCE_ENERGY] < container.store[RESOURCE_ENERGY]) {
                container = c;
            }
        })
        return container;
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getMostFullAllSources(room: Room): AnyStoreStructure|Tombstone|null {
        let container: AnyStoreStructure|Tombstone|null = null;
        this.getAllSources(room).forEach((c) => {
            if (!container || c.store[RESOURCE_ENERGY] > container.store[RESOURCE_ENERGY]) {
                container = c;
            }
        })
        return container;
    }
}
