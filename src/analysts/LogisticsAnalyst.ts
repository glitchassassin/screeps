import { Memoize } from "typescript-memoize";
import { Analyst } from "./Analyst";
import { MapAnalyst } from "./MapAnalyst";

const mapAnalyst = new MapAnalyst();

export class LogisticsAnalyst extends Analyst {
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getContainers(room: Room) {
        return room.find(FIND_STRUCTURES)
            .filter(s => s.structureType === STRUCTURE_CONTAINER) as StructureContainer[];
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
    getAllSources(room: Room): (StructureSpawn|StructureContainer)[] {
        let c = this.getContainers(room);
        if (c.length !== 0) return c;
        return room.find(FIND_MY_SPAWNS) as StructureSpawn[];
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getMostEmptyAllSources(room: Room) {
        let container: StructureContainer|StructureSpawn|null = null;
        this.getAllSources(room).forEach((c: StructureSpawn|StructureContainer) => {
            if (!container || c.store[RESOURCE_ENERGY] < container.store[RESOURCE_ENERGY]) {
                container = c;
            }
        })
        return container;
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getMostFullAllSources(room: Room): StructureContainer|StructureSpawn|null {
        let container: StructureContainer|StructureSpawn|null = null;
        this.getAllSources(room).forEach((c: StructureSpawn|StructureContainer) => {
            if (!container || c.store[RESOURCE_ENERGY] > container.store[RESOURCE_ENERGY]) {
                container = c;
            }
        })
        return container;
    }
}
