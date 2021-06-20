import { CachedConstructionSite } from "WorldState/ConstructionSites";
import { CachedSource } from "WorldState/Sources";
import { Capacity } from "WorldState/Capacity";
import { Controllers } from "WorldState/Controllers";
import { FranchiseData } from "WorldState/FranchiseData";
import { Health } from "WorldState/Health";
import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { LogisticsManager } from "Office/OfficeManagers/LogisticsManager";
import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";
import { Office } from "Office/Office";

export function getBuildEnergyRemaining(target: CachedConstructionSite) {
    return (target.progressTotal ?? 0) - (target.progress ?? 0);
}
export function getRepairEnergyRemaining(target: Id<Structure>) {
    let health = Health.byId(target);
    return ((health?.hitsMax ?? 0) - (health?.hits ?? 0))/100;
}
export function getTransferEnergyRemaining(target: Id<AnyStoreStructure>) {
    let capacity = Capacity.byId(target, RESOURCE_ENERGY);
    return capacity?.free
}
export function getCreepHomeOffice(creep: Creep) {
    if (!creep.memory.office) return;
    return global.boardroom.offices.get(creep.memory.office);
}
export function countEnergyInContainersOrGround(pos?: RoomPosition) {
    if (!pos) return 0;
    let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
    return logisticsAnalyst.getRealLogisticsSources(pos).reduce((sum, resource) => (sum + (Capacity.byId(resource.id)?.used ?? 0)), 0)
}
export function calculateFranchiseSurplus(source: CachedSource) {
    let linkCapacity = Capacity.byId(FranchiseData.byId(source.id)?.linkId)?.used ?? 0;
    return countEnergyInContainersOrGround(source.pos) + linkCapacity;
}

export function sortByDistanceTo<T extends (RoomPosition|_HasRoomPosition)>(pos: RoomPosition) {
    let mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst;
    let distance = new Map<RoomPosition, number>();
    return (a: T, b: T) => {
        let aPos = (a instanceof RoomPosition) ? a : (a as _HasRoomPosition).pos
        let bPos = (b instanceof RoomPosition) ? b : (b as _HasRoomPosition).pos
        if (!distance.has(aPos)){
            distance.set(aPos, mapAnalyst.getRangeTo(pos, aPos))
        }
        if (!distance.has(bPos)) distance.set(bPos, mapAnalyst.getRangeTo(pos, bPos))
        return (distance.get(aPos) as number) - (distance.get(bPos) as number)
    }
}
// profiler.registerFN(sortByDistanceTo, 'sortByDistanceTo');


export function RoomPos(pos: {x: number, y: number, roomName: string}) {
    return new RoomPosition(pos.x, pos.y, pos.roomName);
}

export function buildPriority(site: CachedConstructionSite) {
    // Adds a fractional component to sub-prioritize the most
    // complete construction sites
    let completion = (site.progress ?? 0) / (site.progressTotal ?? 0);
    switch(site.structureType) {
        case STRUCTURE_ROAD:
            return 1 + completion;
        case STRUCTURE_CONTAINER:
            return 10 + completion;
        case STRUCTURE_EXTENSION:
            return 12 + completion;
        default:
            return 5 + completion;
    }
}

export function rclIsGreaterThan(roomName: string, level: number) {
    let roomLevel = Controllers.byRoom(roomName)?.level;
    return (roomLevel && roomLevel > level);
}

export function getRcl(roomName: string) {
    return Controllers.byRoom(roomName)?.level;
}

export function unassignedLogisticsRequestsPercent(office: Office) {
    let logisticsManager = office.managers.get('LogisticsManager') as LogisticsManager;
    let total = 0;
    let unassigned = 0;
    for (let [,req] of logisticsManager.requests) {
        total++;
        if (!req.assigned) {
            unassigned++;
        }
    }
    return unassigned / total;
}

export function getCreepsById(...args: Id<Creep>[]) {
    return args.map(id => Game.getObjectById(id)).filter(c => c !== null) as Creep[];
}

export function byId<T>(id: Id<T>|undefined) {
    return id ? Game.getObjectById(id) ?? undefined : undefined
}
