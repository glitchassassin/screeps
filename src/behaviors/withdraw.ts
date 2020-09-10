export const withdraw = (creep: Creep) => {
    if(creep.store.getFreeCapacity() > 0) {
        var source = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (structure) => (
                structure.structureType === STRUCTURE_CONTAINER &&
                (structure as StructureContainer).store.getUsedCapacity(RESOURCE_ENERGY) > 0
            )
        });
        if (!source) return false; // No source to withdraw from
        if(creep.withdraw(source, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
        return true; // Withdraw behavior success
    }
    return false; // No room to store energy
}
