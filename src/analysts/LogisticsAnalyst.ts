import { object } from "lodash";
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
    getAllSources(room: Room): (StructureContainer|StructureSpawn|Tombstone)[] {
        let c = [...this.getContainers(room), ...this.getTombstones(room)];
        if (c.length !== 0) return c;
        return room.find(FIND_MY_SPAWNS) as StructureSpawn[];
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getHaulers(room: Room): (Creep)[] {
        return room.find(FIND_MY_CREEPS).filter(c => c.memory.type === 'HAULER');
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getMostEmptyAllSources(room: Room) {
        let container: StructureContainer|StructureSpawn|Tombstone|null = null;
        this.getAllSources(room).forEach((c) => {
            if (!container || c.store[RESOURCE_ENERGY] < container.store[RESOURCE_ENERGY]) {
                container = c;
            }
        })
        return container;
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getMostFullAllSources(room: Room): StructureContainer|StructureSpawn|null {
        let container: StructureContainer|StructureSpawn|Tombstone|null = null;
        this.getAllSources(room).forEach((c) => {
            if (!container || c.store[RESOURCE_ENERGY] > container.store[RESOURCE_ENERGY]) {
                container = c;
            }
        })
        return container;
    }
    exportStats() {
        const rooms = Object.values(Game.rooms)
            .map(room => {
                if (room.controller?.my) {
                    return {
                        storageEnergy: (room.storage ? room.storage.store.energy : 0),
                        terminalEnergy: (room.terminal ? room.terminal.store.energy : 0),
                        energyAvailable: room.energyAvailable,
                        energyCapacityAvailable: room.energyCapacityAvailable,
                        controllerProgress: room.controller.progress,
                        controllerProgressTotal: room.controller.progressTotal,
                        controllerLevel: room.controller.level,
                    }
                }
                return undefined;
            })
            .filter(room => room) as { storageEnergy: number; terminalEnergy: number; energyAvailable: number; energyCapacityAvailable: number; controllerProgress: number; controllerProgressTotal: number; controllerLevel: number; }[]
        // Reset stats object
        Memory.stats = {
          gcl: {
            progress: Game.gcl.progress,
            progressTotal: Game.gcl.progressTotal,
            level: Game.gcl.level,
          },
          rooms,
          cpu: {
            bucket: Game.cpu.bucket,
            limit: Game.cpu.limit,
            used: Game.cpu.getUsed(),
          },
          time: Game.time,
        };
      }
}
