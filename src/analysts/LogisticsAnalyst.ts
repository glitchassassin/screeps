import { Office } from "Office/Office";
import { Memoize } from "typescript-memoize";
import { Analyst } from "./Analyst";

export class LogisticsAnalyst extends Analyst {
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getStorage(office: Office) {
        return office.center.room.find(FIND_STRUCTURES)
            .filter(s => s.structureType === STRUCTURE_STORAGE) as StructureStorage[];
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getTombstones(room: Room) {
        return room.find(FIND_TOMBSTONES);
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getFreeEnergy(room: Room) {
        return room.find(FIND_DROPPED_RESOURCES).filter(r => r.resourceType === RESOURCE_ENERGY) as Resource<RESOURCE_ENERGY>[];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getAllSources(office: Office): (AnyStoreStructure|Tombstone|Resource<RESOURCE_ENERGY>)[] {
        let territories = [office.center, ...office.territories];
        return [
            ...territories.map(territory => this.getFreeEnergy(territory.room)).reduce((a, b) => a.concat(b), []),
            ...territories.map(territory => this.getTombstones(territory.room)).reduce((a, b) => a.concat(b), []),
            ...this.getStorage(office),
            ...global.analysts.sales.getFranchiseLocations(office).map(franchise => franchise.container).filter(c => c) as StructureContainer[],
            ...global.analysts.spawn.getSpawns(office)
        ];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getHaulers(office: Office): (Creep)[] {
        return office.employees.filter(c => c.memory.type === 'HAULER');
    }
}
