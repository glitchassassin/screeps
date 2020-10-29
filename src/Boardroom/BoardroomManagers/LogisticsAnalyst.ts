import { getUsedCapacity, sortByDistanceTo } from "utils/gameObjectSelectors";

import { Boardroom } from "Boardroom/Boardroom";
import { BoardroomManager } from "Boardroom/BoardroomManager";
import { CachedCreep } from "WorldState/branches/WorldCreeps";
import { CachedResource } from "WorldState/branches/WorldResources";
import { CachedStructure } from "WorldState";
import { CachedTombstone } from "WorldState/branches/WorldTombstones";
import { MapAnalyst } from "./MapAnalyst";
import { Memoize } from "typescript-memoize";
import { Office } from "Office/Office";
import { SalesAnalyst } from "./SalesAnalyst";
import { lazyFilter } from "utils/lazyIterators";

export type RealLogisticsSources = CachedResource<RESOURCE_ENERGY>|CachedStructure<StructureStorage|StructureContainer>;

export class LogisticsAnalyst extends BoardroomManager {
    constructor(
        boardroom: Boardroom,
        private salesAnalyst = boardroom.managers.get('SalesAnalyst') as SalesAnalyst,
        private mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst
    ) {
        super(boardroom);
    }
    depots = new Map<string, CachedCreep[]>();
    newDepots = new Map<string, CachedCreep[]>();

    cleanup() {
        this.depots = this.newDepots;
        this.newDepots = new Map<string, CachedCreep[]>();
    }

    @Memoize((office: Office) => ('' + office.name + Game.time))
    getStorage(office: Office) {
        let storage = global.worldState.rooms.byRoom.get(office.center.name)?.gameObj.storage;
        return storage && global.worldState.structures.byId.get(storage.id) as CachedStructure<StructureStorage> | undefined;
    }
    @Memoize((roomName: string) => ('' + roomName + Game.time))
    getTombstones(roomName: string) {
        return Array.from(lazyFilter(
            global.worldState.tombstones.byRoom.get(roomName) ?? [],
            t => t.capacityUsed ?? 0
        )) as CachedTombstone[];
    }
    @Memoize((roomName: string) => ('' + roomName + Game.time))
    getContainers(roomName: string) {
        return Array.from(lazyFilter(
            global.worldState.structures.byRoom.get(roomName) ?? [],
            s => s.structureType === STRUCTURE_CONTAINER && s.capacityUsed && s.capacityUsed > 0
        )) as CachedStructure<StructureContainer>[];
    }
    @Memoize((roomName: string) => ('' + roomName + Game.time))
    getFreeEnergy(roomName: string) {
        return Array.from(lazyFilter(
            global.worldState.resources.byRoom.get(roomName) ?? [],
            t => t.resourceType === RESOURCE_ENERGY
        )) as CachedResource<RESOURCE_ENERGY>[];
    }
    @Memoize((pos: RoomPosition) => ('' + pos + Game.time))
    getRealLogisticsSources(pos: RoomPosition): RealLogisticsSources[] {
        if (!Game.rooms[pos.roomName]) return [];
        let items = Game.rooms[pos.roomName].lookAtArea(pos.y - 1, pos.x - 1, pos.y + 1, pos.x + 1, true)
        let results: RealLogisticsSources[] = [];
        for (let item of items) {
            if (item.resource instanceof Resource && item.resource.resourceType === RESOURCE_ENERGY) {
                let resource = global.worldState.resources.byId.get(item.resource.id) as CachedResource<RESOURCE_ENERGY>;
                if (resource) results.push(resource);
            } else if (item.structure instanceof StructureContainer || item.structure instanceof StructureStorage) {
                let structure = global.worldState.structures.byId.get(item.structure.id) as CachedStructure<StructureStorage>;
                if (structure) results.push(structure);
            }
        }
        return results.sort((a, b) => getUsedCapacity(b) - getUsedCapacity(a))
    }
    @Memoize((pos: RoomPosition) => ('' + pos + Game.time))
    getClosestAllSources(pos: RoomPosition, resource = RESOURCE_ENERGY) {
        let office = global.boardroom.getClosestOffice(pos);
        if (!office) return undefined;
        let sorted = this.getAllSources(office).filter(s => getUsedCapacity(s) > 0).sort(sortByDistanceTo(pos))
        return sorted[0];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getAllSources(office: Office): (CachedStructure<AnyStoreStructure>|CachedTombstone|CachedCreep|CachedResource<RESOURCE_ENERGY>)[] {
        let territories = [office.center, ...office.territories];
        let depots = this.depots.get(office.name) ?? [];
        return [
            ...this.getFreeSources(office),
            ...depots,
            ...territories.flatMap(territory => this.getContainers(territory.name))
        ];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getFreeSources(office: Office): (CachedStructure<AnyStoreStructure>|CachedTombstone|CachedResource<RESOURCE_ENERGY>)[] {
        let territories = [office.center, ...office.territories];
        let freeSources: (CachedStructure<AnyStoreStructure>|CachedTombstone|CachedResource<RESOURCE_ENERGY>)[] = [
            ...territories.filter(t => t.room).flatMap(territory => this.getFreeEnergy(territory.name)),
            ...territories.filter(t => t.room).flatMap(territory => this.getTombstones(territory.name)),
        ];
        let storage = this.getStorage(office);
        let storageCapacity = storage?.capacityUsed ?? 0;
        if (storage && storageCapacity > 0)
            freeSources.push(storage);
        return freeSources;
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getUnallocatedSources(office: Office): (CachedStructure<AnyStoreStructure>|CachedTombstone|CachedResource<RESOURCE_ENERGY>)[] {
        return [
            ...this.getFreeSources(office),
            ...this.salesAnalyst.getUsableSourceLocations(office)
                .map(source => source.container)
                .filter(c => c && c.capacityUsed > 0) as CachedStructure<StructureContainer>[],
        ];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getCarriers(office: Office) {
        return Array.from(lazyFilter(
            global.worldState.creeps.byOffice.get(office.center.name) ?? [],
            c => c.memory.type === 'CARRIER'
        ))
    }
    reportDepot(creep: CachedCreep) {
        if (!creep.memory.office) return;
        let depots = this.newDepots.get(creep.memory.office);

        if (!depots) {
            this.newDepots.set(creep.memory.office, [creep]);
        } else {
            depots.push(creep);
        }
    }
}
