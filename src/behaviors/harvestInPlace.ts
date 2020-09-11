export const harvestInPlace = (creep: Creep) => {
    var source = creep.pos.findClosestByPath(FIND_SOURCES);
    if (!source) return false; // No source to harvest
    if(creep.harvest(source) == OK) {
        return true; // Harvest behavior success
    }
    return false;
}
