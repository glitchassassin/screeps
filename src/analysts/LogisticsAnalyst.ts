import { Analyst } from "./Analyst";
import { MapAnalyst } from "./MapAnalyst";

const mapAnalyst = new MapAnalyst();

export class LogisticsAnalyst extends Analyst {
    getContainers = (room: Room) => {
        return room.find(FIND_STRUCTURES)
            .filter(s => s.structureType === STRUCTURE_CONTAINER) as StructureContainer[];
    }
    getMostEmptyContainer = (room: Room) => {
        let container: StructureContainer|null = null;
        this.getContainers(room).forEach(c => {
            if (!container || c.store[RESOURCE_ENERGY] < container.store[RESOURCE_ENERGY]) {
                container = c;
            }
        })
        return container;
    }
    getMostFullContainer = (room: Room) => {
        let container: StructureContainer|null = null;
        this.getContainers(room).forEach(c => {
            if (!container || c.store[RESOURCE_ENERGY] > container.store[RESOURCE_ENERGY]) {
                container = c;
            }
        })
        return container;
    }
    getAllSources = (room: Room): StructureSpawn[]|StructureContainer[] => {
        let c = this.getContainers(room);
        if (c.length !== 0) return c;
        return room.find(FIND_MY_SPAWNS) as StructureSpawn[];
    }
    getMostEmptyAllSources = (room: Room) => {
        let container: StructureContainer|StructureSpawn|null = null;
        this.getAllSources(room).forEach((c: StructureSpawn|StructureContainer) => {
            if (!container || c.store[RESOURCE_ENERGY] < container.store[RESOURCE_ENERGY]) {
                container = c;
            }
        })
        return container;
    }
    getMostFullAllSources = (room: Room): StructureContainer|StructureSpawn|null => {
        let container: StructureContainer|StructureSpawn|null = null;
        this.getAllSources(room).forEach((c: StructureSpawn|StructureContainer) => {
            if (!container || c.store[RESOURCE_ENERGY] > container.store[RESOURCE_ENERGY]) {
                container = c;
            }
        })
        return container;
    }
}
