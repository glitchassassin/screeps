export const build = (creep: Creep) => {
    var target = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);
    if (!target) return false; // No building targets - fall back to next priority role
    if(creep.build(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {visualizePathStyle: {stroke: '#ffffff'}});
    }
    return true;
}
