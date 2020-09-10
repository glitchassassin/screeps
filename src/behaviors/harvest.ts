export const harvest = (creep: Creep) => {
    if(creep.store.getFreeCapacity() > 0) {
        var source = creep.pos.findClosestByPath(FIND_SOURCES);
        if (!source) return false; // No source to harvest
        if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
            creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
        }
        return true; // Harvest behavior success
    }
    return false; // No room to store harvest
}
