import { CachedConstructionSite, CachedStructure } from "WorldState";

import { CachedCreep } from "WorldState/branches/WorldMyCreeps";
import { CachedResource } from "WorldState/branches/WorldResources";
import { CachedTombstone } from "WorldState/branches/WorldTombstones";
import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";

export interface WithPos {
    pos: RoomPosition
}

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

export function sortByDistanceTo<T extends WithPos>(pos: RoomPosition) {
    let mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst;
    let distance = new Map<T, number>();
    return (a: T, b: T) => {
        if (!distance.has(a)){
            distance.set(a, mapAnalyst.getRangeTo(pos, a.pos))
        }
        if (!distance.has(b)) distance.set(b, mapAnalyst.getRangeTo(pos, b.pos))
        return (distance.get(a) as number) - (distance.get(b) as number)
    }
}

export function RoomPos(pos: {x: number, y: number, roomName: string}) {
    return new RoomPosition(pos.x, pos.y, pos.roomName);
}
