export const thug = (creep: Creep) => {
    var target = creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS);
    if (!target) return false; // No hostile targets - fall back to next priority role
    if(creep.attack(target) == ERR_NOT_IN_RANGE) {
        creep.moveTo(target, {visualizePathStyle: {stroke: '#ff0000'}});
    }
    return true;
}
