export const repair = (creep: Creep) => {
    const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: object => object.hits < object.hitsMax
    });
    if (!target) return false; // No repair targets
    if(creep.repair(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
    }
    return true;
}
