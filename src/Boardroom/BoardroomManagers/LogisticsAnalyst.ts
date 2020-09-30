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
    getFreeEnergy(room: Room) {
        return room.find(FIND_DROPPED_RESOURCES).filter(r => r.resourceType === RESOURCE_ENERGY) as Resource<RESOURCE_ENERGY>[];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getAllSources(office: Office): (AnyStoreStructure|Tombstone|Resource<RESOURCE_ENERGY>)[] {
        let salesAnalyst = this.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let territories = [office.center, ...office.territories];
        return [
            ...territories.filter(t => t.room).map(territory => this.getFreeEnergy(territory.room as Room)).reduce((a, b) => a.concat(b), []),
            ...territories.filter(t => t.room).map(territory => this.getTombstones(territory.room as Room)).reduce((a, b) => a.concat(b), []),
            ...this.getStorage(office).filter(s => s.store.getUsedCapacity() > 0),
            ...salesAnalyst.getFranchiseLocations(office)
                .map(franchise => franchise.container)
                .filter(c => c && c.store.getUsedCapacity() > 0) as StructureContainer[],
            ...hrAnalyst.getSpawns(office)
        ];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getHaulers(office: Office): (Creep)[] {
        return office.employees.filter(c => c.memory.type === 'HAULER');
    }
}
