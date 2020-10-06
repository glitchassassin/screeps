import { CachedConstructionSite } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";

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
    if (!Game.rooms[pos.roomName]) return 0;
    let resources = pos.findInRange(FIND_DROPPED_RESOURCES, 1).reduce((sum, resource) => (sum + resource.amount), 0)
    let containers = pos.findInRange(FIND_STRUCTURES, 1)
        .filter(s => s.structureType === STRUCTURE_CONTAINER)
        .reduce((sum, container) => (sum + (container as StructureContainer).store.getUsedCapacity(RESOURCE_ENERGY)), 0)
    return resources + containers;
}
