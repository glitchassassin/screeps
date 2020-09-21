export function getBuildEnergyRemaining(target: ConstructionSite) {
    return target.progressTotal - target.progress;
}
export function getRepairEnergyRemaining(target: Structure) {
    return (target.hitsMax - target.hits)/100;
}
export function getTransferEnergyRemaining(target: StructureContainer|StructureSpawn|StructureExtension) {
    return (target as StructureContainer).store.getFreeCapacity(RESOURCE_ENERGY);
}
