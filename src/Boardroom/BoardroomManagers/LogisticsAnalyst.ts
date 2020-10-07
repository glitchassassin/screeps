import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Office } from "Office/Office";
import { Memoize } from "typescript-memoize";
import { MapAnalyst } from "./MapAnalyst";
import { SalesAnalyst } from "./SalesAnalyst";

export class LogisticsAnalyst extends BoardroomManager {
    depots = new Map<Office, Creep[]>();

    plan() {
        this.depots = new Map<Office, Creep[]>();
    }

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
    @Memoize((pos: RoomPosition) => ('' + pos + Game.time))
    getClosestAllSources(pos: RoomPosition): (AnyStoreStructure|Tombstone|Creep|Resource<RESOURCE_ENERGY>|undefined) {
        let mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst
        let office = global.boardroom.getClosestOffice(pos);
        if (!office) return undefined;
        let distance = new Map<(AnyStoreStructure|Tombstone|Creep|Resource<RESOURCE_ENERGY>), number>();
        return this.getAllSources(office).sort((a, b) => {
            if (!distance.has(a)) distance.set(a, mapAnalyst.getRangeTo(pos, a.pos))
            if (!distance.has(b)) distance.set(b, mapAnalyst.getRangeTo(pos, b.pos))
            return (distance.get(a) as number) - (distance.get(b) as number)
        })[0]
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getAllSources(office: Office): (AnyStoreStructure|Tombstone|Creep|Resource<RESOURCE_ENERGY>)[] {
        let territories = [office.center, ...office.territories];
        let depots = this.depots.get(office) ?? [];
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
    @Memoize((office: Office) => ('' + office.name + Game.time))
    reportDepot(creep: Creep) {
        if (!creep.memory.office) return;
        let office = global.boardroom.offices.get(creep.memory.office)
        if (!office) return;
        let depots = this.depots.get(office);

        if (!depots) {
            this.depots.set(office, [creep]);
        } else {
            depots.push(creep);
        }
    }
}
