import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Office } from "Office/Office";
import { Memoize } from "typescript-memoize";
import { HRAnalyst } from "./HRAnalyst";
import { SalesAnalyst } from "./SalesAnalyst";

export class LogisticsAnalyst extends BoardroomManager {
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getStorage(office: Office) {
        return office.center.room.find(FIND_MY_STRUCTURES)
            .filter(s => s.structureType === STRUCTURE_STORAGE) as StructureStorage[];
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getTombstones(room: Room) {
        return room.find(FIND_TOMBSTONES).filter(t => t.store.getUsedCapacity() > 0);
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getContainers(room: Room) {
        return room.find(FIND_STRUCTURES)
            .filter(s => s.structureType === STRUCTURE_CONTAINER && s.store.getUsedCapacity() > 0) as StructureContainer[];
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getFreeEnergy(room: Room) {
        return room.find(FIND_DROPPED_RESOURCES).filter(r => r.resourceType === RESOURCE_ENERGY) as Resource<RESOURCE_ENERGY>[];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getAllSources(office: Office): (AnyStoreStructure|Tombstone|Creep|Resource<RESOURCE_ENERGY>)[] {
        let territories = [office.center, ...office.territories];
        let depots = office.employees.filter(creep => creep.memory.depot);
        return [
            ...this.getFreeSources(office),
            ...depots,
            ...territories
                .filter(t => t.room)
                .map(territory => this.getContainers(territory.room as Room))
                .reduce((a, b) => a.concat(b), []),
        ];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getFreeSources(office: Office): (AnyStoreStructure|Tombstone|Resource<RESOURCE_ENERGY>)[] {
        let territories = [office.center, ...office.territories];
        return [
            ...territories.filter(t => t.room).map(territory => this.getFreeEnergy(territory.room as Room)).reduce((a, b) => a.concat(b), []),
            ...territories.filter(t => t.room).map(territory => this.getTombstones(territory.room as Room)).reduce((a, b) => a.concat(b), []),
            ...this.getStorage(office).filter(s => s.store.getUsedCapacity() > 0),
        ];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getUnallocatedSources(office: Office): (AnyStoreStructure|Tombstone|Resource<RESOURCE_ENERGY>)[] {
        let salesAnalyst = this.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        return [
            ...this.getFreeSources(office),
            ...salesAnalyst.getFranchiseLocations(office)
                .map(franchise => franchise.container)
                .filter(c => c && c.store.getUsedCapacity() > 0) as StructureContainer[],
        ];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getCarriers(office: Office): (Creep)[] {
        return office.employees.filter(c => c.memory.type === 'CARRIER');
    }
}
