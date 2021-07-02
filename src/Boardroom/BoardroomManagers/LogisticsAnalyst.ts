import { CachedStructure, Structures } from "WorldState/Structures";
import { getCreepsById, sortByDistanceTo } from "utils/gameObjectSelectors";

import { Boardroom } from "Boardroom/Boardroom";
import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Capacity } from "WorldState/Capacity";
import { Controllers } from "WorldState/Controllers";
import { FranchiseData } from "WorldState/FranchiseData";
import { HRAnalyst } from "./HRAnalyst";
import { LegalData } from "WorldState/LegalData";
import { MemoizeByTick } from "utils/memoize";
import { Office } from "Office/Office";
import { Resources } from "WorldState/Resources";
import { RoomData } from "WorldState/Rooms";
import { SalesAnalyst } from "./SalesAnalyst";
import { packPos } from "utils/packrat";

export type RealLogisticsSources = Resource<RESOURCE_ENERGY>|CachedStructure<StructureStorage|StructureContainer|StructureLink>;

const STORAGE_GOALS: Record<number, number> = {
    0:       0,
    1:       0,
    2:       0,
    3:       0,
    4:   50000,
    5:  100000,
    6:  200000,
    7:  500000,
    8: 1000000
}

export class LogisticsAnalyst extends BoardroomManager {
    constructor(
        boardroom: Boardroom,
        private salesAnalyst = boardroom.managers.get('SalesAnalyst') as SalesAnalyst
    ) {
        super(boardroom);
    }
    depots = new Map<string, Id<Creep>[]>();
    newDepots = new Map<string, Id<Creep>[]>();

    cleanup() {
        this.depots = this.newDepots;
        this.newDepots = new Map();
    }

    @MemoizeByTick((office: Office) => office.name)
    getStorage(office: Office) {
        let storage = Game.rooms[office.center.name]?.storage;
        return storage && Structures.byId(storage.id)
    }
    @MemoizeByTick((office: Office) => office.name)
    getTombstones(office: Office) {
        let tombstones = [];
        for (let r of RoomData.byOffice(office)) {
            if (Game.rooms[r.name]) {
                tombstones.push(...Game.rooms[r.name].find(FIND_TOMBSTONES).filter(t => t.store.getUsedCapacity() > 0))
            }
        }
        return tombstones;
    }
    @MemoizeByTick((office: Office) => office.name)
    getContainers(office: Office) {
        return Structures.byOffice(office).filter(s => s.structureType === STRUCTURE_CONTAINER) as CachedStructure<StructureContainer>[];
    }
    @MemoizeByTick((office: Office) => office.name)
    getLinks(office: Office, outputsOnly = false) {
        if (outputsOnly) {
            return Structures.byOffice(office).filter(s => s.id === LegalData.byRoom(office.name)?.linkId) as CachedStructure<StructureLink>[];
        } else {
            return Structures.byOffice(office).filter(s => s.structureType === STRUCTURE_LINK) as CachedStructure<StructureLink>[];
        }
    }
    @MemoizeByTick((office: Office) => office.name)
    getFreeEnergy(office: Office) {
        return Resources.byOffice(office, RESOURCE_ENERGY);
    }
    @MemoizeByTick((pos: RoomPosition) => packPos(pos))
    getRealLogisticsSources(pos: RoomPosition, includeAdjacent = true, emergency = false): RealLogisticsSources[] {
        if (!Game.rooms[pos.roomName]) return [];
        let items;
        if (includeAdjacent) {
            items = Game.rooms[pos.roomName].lookAtArea(pos.y - 1, pos.x - 1, pos.y + 1, pos.x + 1, true)
        } else {
            items = Game.rooms[pos.roomName].lookAt(pos)
        }
        let results: RealLogisticsSources[] = [];
        for (let item of items) {
            if (item.resource instanceof Resource && item.resource.resourceType === RESOURCE_ENERGY) {
                results.push(item.resource as Resource<RESOURCE_ENERGY>);
            } else if (item.structure instanceof StructureContainer || item.structure instanceof StructureStorage || item.structure instanceof StructureLink) {
                results.push(item.structure);
            }
        }
        return results.sort((a, b) => (Capacity.byId(b.id)?.used ?? 0) - (Capacity.byId(a.id)?.used ?? 0))
    }
    @MemoizeByTick((pos: RoomPosition) => packPos(pos))
    getClosestAllSources(pos: RoomPosition, amount?: number) {
        let office = global.boardroom.getClosestOffice(pos);
        if (!office) return undefined;
        let sorted = this.getAllSources(office).filter(s => s.pos).sort(sortByDistanceTo(pos))
        if (!amount || amount === 0) return sorted[0];
        // Prioritize Depots, then dropped Resources, then sources that can provide the full amount
        let withAmount = sorted.filter(s => {
            return s instanceof Creep || s instanceof Resource || (Capacity.byId(s.id)?.used ?? 0) > amount
        })
        if (withAmount.length > 0) return withAmount[0];
        return sorted[0];
    }
    @MemoizeByTick((office: Office) => office.name)
    getAllSources(office: Office, emergency = false): (CachedStructure<AnyStoreStructure>|Tombstone|Creep|Resource<RESOURCE_ENERGY>)[] {
        let depots = this.depots.get(office.name) ?? [];
        return [
            ...this.getLinks(office, true),
            ...this.getFreeSources(office),
            ...getCreepsById(...depots),
            ...this.getContainers(office),
            ...this.getStorageSources(office, emergency),
        ];
    }
    @MemoizeByTick((office: Office) => office.name)
    getStorageSources(office: Office, emergency = false): (CachedStructure<AnyStoreStructure>|Tombstone|Resource<RESOURCE_ENERGY>)[] {
        let rcl = Controllers.byRoom(office.name)?.level;
        let storage = this.getStorage(office);
        let storageCapacity = storage ? Capacity.byId(storage.id)?.used ?? 0 : 0;
        if (rcl && storage && (emergency || storageCapacity > STORAGE_GOALS[rcl]))
            return [storage];
        return [];
    }
    @MemoizeByTick((office: Office) => office.name)
    getFreeSources(office: Office): (CachedStructure<AnyStoreStructure>|Tombstone|Resource<RESOURCE_ENERGY>)[] {
        let freeSources: (CachedStructure<AnyStoreStructure>|Tombstone|Resource<RESOURCE_ENERGY>)[] = [
            ...this.getFreeEnergy(office),
            ...this.getTombstones(office),
        ];
        return freeSources;
    }
    @MemoizeByTick((office: Office) => office.name)
    getUnallocatedSources(office: Office): (CachedStructure<AnyStoreStructure>|Tombstone|Resource<RESOURCE_ENERGY>)[] {
        return [
            ...this.getFreeSources(office),
            ...this.salesAnalyst.getUsableSourceLocations(office)
                .map(source => Structures.byId(FranchiseData.byId(source.id)?.containerId))
                .filter(c => c && (Capacity.byId(c.id)?.used ?? 0) > 0) as CachedStructure<StructureContainer>[],
        ];
    }
    @MemoizeByTick((office: Office) => office.name)
    getCarriers(office: Office) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst
        return hrAnalyst.getEmployees(office, 'CARRIER');
    }
    reportDepot(creep: Creep) {
        if (!creep.memory.office) return;
        let depots = this.newDepots.get(creep.memory.office);

        if (!depots) {
            this.newDepots.set(creep.memory.office, [creep.id]);
        } else {
            depots.push(creep.id);
        }
    }
}
