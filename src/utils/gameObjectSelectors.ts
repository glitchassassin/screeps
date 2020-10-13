import { CachedConstructionSite } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";

export interface WithPos {
    pos: RoomPosition
}

export function getBuildEnergyRemaining(target: CachedConstructionSite|ConstructionSite) {
    return target.progressTotal - target.progress;
}
export function getRepairEnergyRemaining(target: Structure) {
    return (target.hitsMax - target.hits)/100;
}
export function getTransferEnergyRemaining(target: AnyStoreStructure) {
    return (target.store as GenericStore).getFreeCapacity(RESOURCE_ENERGY);
}
export function getCreepHomeOffice(creep: Creep) {
    if (!creep.memory.office) return;
    return global.boardroom.offices.get(creep.memory.office);
}
export function countEnergyInContainersOrGround(pos: RoomPosition) {
    let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
    return logisticsAnalyst.getRealLogisticsSources(pos).reduce((sum, resource) => (sum + getCapacity(resource)), 0)
}
export function getCapacity(gameObj: Resource<RESOURCE_ENERGY>|AnyStoreStructure|Creep|Tombstone): number {
    if (gameObj instanceof Resource) {
        return gameObj.amount;
    } else {
        return (gameObj.store as GenericStore).getUsedCapacity(RESOURCE_ENERGY) ?? 0;
    }
}
export function getFreeCapacity(gameObj: AnyStoreStructure|Creep): number {
    return (gameObj.store as GenericStore).getFreeCapacity(RESOURCE_ENERGY) ?? 0;
}
export function getMaxCapacity(gameObj: AnyStoreStructure|Creep): number {
    return (gameObj.store as GenericStore).getCapacity(RESOURCE_ENERGY) ?? 0;
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
