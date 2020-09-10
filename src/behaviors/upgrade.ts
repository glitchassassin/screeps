export const upgrade = (creep: Creep) => {
    if (!creep.room.controller) return false;
    if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
        creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
    }
    return true;
}
