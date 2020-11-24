import { CachedConstructionSite, CachedStructure } from "WorldState";

import { CachedCreep } from "WorldState/branches/WorldMyCreeps";
import { CachedResource } from "WorldState/branches/WorldResources";
import { CachedTombstone } from "WorldState/branches/WorldTombstones";
import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { LogisticsManager } from "Office/OfficeManagers/LogisticsManager";
import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";
import { Office } from "Office/Office";
import profiler from "screeps-profiler";

export function getBuildEnergyRemaining(target: CachedConstructionSite|ConstructionSite) {
    return (target.progressTotal ?? 0) - (target.progress ?? 0);
}
export function getRepairEnergyRemaining(target: CachedStructure|Structure) {
    return ((target.hitsMax ?? 0) - (target.hits ?? 0))/100;
}
export function getTransferEnergyRemaining(target: CachedStructure<AnyStoreStructure>) {
    return (target.gameObj?.store as GenericStore).getFreeCapacity(RESOURCE_ENERGY);
}
export function getCreepHomeOffice(creep: Creep) {
    if (!creep.memory.office) return;
    return global.boardroom.offices.get(creep.memory.office);
}
export function countEnergyInContainersOrGround(pos: RoomPosition) {
    let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
    return logisticsAnalyst.getRealLogisticsSources(pos).reduce((sum, resource) => (sum + getUsedCapacity(resource)), 0)
}
export function getUsedCapacity(gameObj: CachedResource<RESOURCE_ENERGY>|CachedStructure<AnyStoreStructure>|CachedCreep|CachedTombstone): number {
    if (gameObj instanceof CachedResource) {
        return gameObj.amount;
    } else {
        return gameObj.capacityUsed ?? 0;
    }
}
export function getFreeCapacity(cached: CachedStructure<AnyStoreStructure>|CachedCreep): number {
    return (cached.gameObj?.store as GenericStore).getFreeCapacity(RESOURCE_ENERGY) ?? 0;
}
export function getCapacity(cached: CachedStructure<AnyStoreStructure>|CachedCreep): number {
    return (cached.gameObj?.store as GenericStore).getCapacity(RESOURCE_ENERGY) ?? 0;
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
profiler.registerFN(sortByDistanceTo, 'sortByDistanceTo');


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
export function repairRemaining(structure: CachedStructure) {
    let hitsMax = (structure.hitsMax ?? 0);
    if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
        hitsMax = Math.min(hitsMax, 100000);
    }
    return hitsMax - (structure.hits ?? 0)
}

export function rclIsGreaterThan(roomName: string, level: number) {
    let roomLevel = global.worldState.controllers.byRoom.get(roomName)?.level;
    return (roomLevel && roomLevel > level);
}

export function getRcl(roomName: string) {
    return global.worldState.controllers.byRoom.get(roomName)?.level;
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
