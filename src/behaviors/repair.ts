export const repair = (creep: Creep) => {
    let target: Structure|null = null;
    creep.room.find(FIND_STRUCTURES).forEach(structure => {
        if (structure.hits < structure.hitsMax) {
            if (target && target.hits < structure.hits) return;
            target = structure;
        }
    })
    if (!target) return false; // No repair targets
    if(creep.repair(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
    }
    return true;
}
