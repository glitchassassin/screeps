export const deposit = (creep: Creep, structures: string[]) => {
    var target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure: Structure) => {
            return (
                structures.includes(structure.structureType) &&
                ((structure as StructureContainer).store as Store<RESOURCE_ENERGY, false>).getFreeCapacity(RESOURCE_ENERGY) > 0
            );
        }
    });
    if (!target) return false; // No storage available - default to next priority role
    if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
    }
    return true;
}
