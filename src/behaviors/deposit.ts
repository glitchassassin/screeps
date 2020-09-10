export const deposit = (creep: Creep) => {
    var target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (structure: Structure) => {
            return (structure.structureType == STRUCTURE_EXTENSION ||
                    structure.structureType == STRUCTURE_SPAWN ||
                    structure.structureType == STRUCTURE_TOWER) &&
                    (structure as StructureExtension|StructureSpawn|StructureTower).store.getFreeCapacity(RESOURCE_ENERGY) > 0;
        }
    });
    if (!target) return false; // No storage available - default to next priority role
    if(creep.transfer(target, RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
    }
    return true;
}
