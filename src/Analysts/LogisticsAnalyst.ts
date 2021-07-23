import { CachedStructure, Structures } from "WorldState/Structures";

import { CachedFranchise } from "WorldState/FranchiseData";
import { Capacity } from "WorldState/Capacity";
import { Controllers } from "WorldState/Controllers";
import { HRAnalyst } from "Analysts/HRAnalyst";
import { LegalData } from "WorldState/LegalData";
import { MapAnalyst } from "./MapAnalyst";
import { MemoizeByTick } from "utils/memoize";
import type { Office } from "Office/Office";
import { Resources } from "WorldState/Resources";
import { RoomData } from "WorldState/Rooms";
import type { Route } from "WorldState/LogisticsRouteModel";
import { packPos } from "utils/packrat";

export type RealLogisticsSources = Resource|CachedStructure<AnyStoreStructure>|Tombstone;

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

export class LogisticsAnalyst {
    @MemoizeByTick((office: Office) => office.name)
    static getStorage(office: Office) {
        let storage = Game.rooms[office.center.name]?.storage;
        return storage && Structures.byId(storage.id)
    }
    @MemoizeByTick((office: Office) => office.name)
    static getTombstones(office: Office) {
        let tombstones = [];
        for (let r of RoomData.byOffice(office)) {
            if (Game.rooms[r.name]) {
                tombstones.push(...Game.rooms[r.name].find(FIND_TOMBSTONES).filter(t => t.store.getUsedCapacity() > 0))
            }
        }
        return tombstones;
    }
    @MemoizeByTick((office: Office) => office.name)
    static getContainers(office: Office) {
        return Structures.byOffice(office).filter(s => s.structureType === STRUCTURE_CONTAINER) as CachedStructure<StructureContainer>[];
    }
    @MemoizeByTick((office: Office) => office.name)
    static getLinks(office: Office, outputsOnly = false) {
        if (outputsOnly) {
            return Structures.byOffice(office).filter(s => s.id === LegalData.byRoom(office.name)?.linkId) as CachedStructure<StructureLink>[];
        } else {
            return Structures.byOffice(office).filter(s => s.structureType === STRUCTURE_LINK) as CachedStructure<StructureLink>[];
        }
    }
    @MemoizeByTick((office: Office) => office.name)
    static getFreeEnergy(office: Office) {
        return Resources.byOffice(office, RESOURCE_ENERGY);
    }
    @MemoizeByTick((pos: RoomPosition) => packPos(pos))
    static getRealLogisticsSources(pos: RoomPosition, includeAdjacent = true, resource?: ResourceConstant): RealLogisticsSources[] {
        let sourceStructures: StructureConstant[] = [STRUCTURE_CONTAINER, STRUCTURE_STORAGE, STRUCTURE_LINK];
        if (!Game.rooms[pos.roomName]) return [];
        let items;
        if (includeAdjacent) {
            items = Game.rooms[pos.roomName].lookAtArea(pos.y - 1, pos.x - 1, pos.y + 1, pos.x + 1, true)
        } else {
            items = Game.rooms[pos.roomName].lookAt(pos)
        }
        let results: RealLogisticsSources[] = [];
        for (let item of items) {
            if (
                item.resource instanceof Resource &&
                (
                    !resource ||
                    item.resource.resourceType === resource
                )
            ) {
                results.push(item.resource);
            } else if (
                item.structure &&
                (item.structure as AnyStoreStructure).store &&
                sourceStructures.includes(item.structure.structureType) &&
                (
                    !resource ||
                    (item.structure as AnyStoreStructure).store[resource]
                )
            ) {
                results.push(item.structure as AnyStoreStructure);
            }
        }
        return results.sort((a, b) => (Capacity.byId(b.id, resource)?.used ?? 0) - (Capacity.byId(a.id, resource)?.used ?? 0))
    }
    @MemoizeByTick((pos: RoomPosition) => packPos(pos))
    static getClosestAllSources(pos: RoomPosition, amount?: number) {
        let office = global.boardroom.getClosestOffice(pos);
        if (!office) return undefined;
        let sorted = this.getAllSources(office).filter(s => s.pos).sort(MapAnalyst.sortByDistanceTo(pos))
        if (!amount || amount === 0) return sorted[0];
        // Prioritize Depots, then dropped Resources, then sources that can provide the full amount
        let withAmount = sorted.filter(s => {
            return s instanceof Creep || s instanceof Resource || (Capacity.byId(s.id)?.used ?? 0) > amount
        })
        if (withAmount.length > 0) return withAmount[0];
        return sorted[0];
    }
    @MemoizeByTick((office: Office) => office.name)
    static getAllSources(office: Office, emergency = false): (CachedStructure<AnyStoreStructure>|Tombstone|Creep|Resource<RESOURCE_ENERGY>)[] {
        return [
            ...this.getLinks(office, true),
            ...this.getFreeSources(office),
            ...this.getContainers(office),
            ...this.getStorageSources(office, emergency),
        ];
    }
    @MemoizeByTick((office: Office) => office.name)
    static getStorageSources(office: Office, emergency = false): (CachedStructure<AnyStoreStructure>|Tombstone|Resource<RESOURCE_ENERGY>)[] {
        let rcl = Controllers.byRoom(office.name)?.level;
        let storage = this.getStorage(office);
        let storageCapacity = Capacity.byId(storage?.id)?.used ?? 0;
        if (rcl && storage && (emergency || storageCapacity > STORAGE_GOALS[rcl]))
            return [storage];
        return [];
    }
    @MemoizeByTick((office: Office) => office.name)
    static getFreeSources(office: Office): (CachedStructure<AnyStoreStructure>|Tombstone|Resource<RESOURCE_ENERGY>)[] {
        let freeSources: (CachedStructure<AnyStoreStructure>|Tombstone|Resource<RESOURCE_ENERGY>)[] = [
            ...this.getFreeEnergy(office),
            ...this.getTombstones(office),
        ];
        return freeSources;
    }
    @MemoizeByTick((office: Office) => office.name)
    static getAccountants(office: Office) {
        return HRAnalyst.getEmployees(office, 'ACCOUNTANT');
    }
    @MemoizeByTick((pos?: RoomPosition) => pos ? packPos(pos) : '')
    static countEnergyInContainersOrGround(pos?: RoomPosition, includeAdjacent = true, resource?: ResourceConstant) {
        if (!pos) return 0;
        return LogisticsAnalyst.getRealLogisticsSources(pos, includeAdjacent, resource).reduce((sum, resource) => (sum + (Capacity.byId(resource.id)?.used ?? 0)), 0)
    }
    @MemoizeByTick((franchise: CachedFranchise) => franchise.id)
    static calculateFranchiseSurplus(franchise: CachedFranchise) {
        let linkCapacity = Capacity.byId(franchise.linkId)?.used ?? 0;
        return this.countEnergyInContainersOrGround(franchise.pos) + linkCapacity;
    }
    static calculateRouteThroughput(route: Route) {
        if (route.sources.some(s => s.structureType === STRUCTURE_STORAGE)) {
            // Throughput is based on lower of source and destination capacity
            return Math.min(
                route.destinations
                    .reduce((sum, s) => {
                        // Capacity is based on CONTAINER_CAPACITY if no structure limits
                        let capacity = Capacity.byId(s.structure?.id as Id<AnyStoreStructure>)?.free

                        if (capacity === undefined && s.structureType === STRUCTURE_STORAGE) {
                            capacity = CONTAINER_CAPACITY - LogisticsAnalyst.countEnergyInContainersOrGround(s.pos)
                        }

                        return sum + (capacity ?? 0);
                    }, 0),

                route.sources
                    .reduce((sum, s) => sum + LogisticsAnalyst.countEnergyInContainersOrGround(s.pos), 0)
            )
        } else {
            // Throughput is based on route length & source efficiency
            // We can approximate by RCL
            const inputPerTick = route.sources.reduce((sum, s) =>
                sum + (Controllers.byRoom(s.pos.roomName)?.my ? 10 : 5),
                0
            )
            return inputPerTick * route.length;
        }
    }
}
