export const depositInPlace = (creep: Creep) => {
    var target = creep.pos.lookFor(LOOK_STRUCTURES).find((structure: Structure) => {
        return (
            structure.structureType === STRUCTURE_CONTAINER &&
            ((structure as StructureContainer).store as Store<RESOURCE_ENERGY, false>).getFreeCapacity(RESOURCE_ENERGY) > 0
        );
    }
    );
    if (!target) return false; // No storage available - default to next priority role

    creep.transfer(target, RESOURCE_ENERGY);

    return true;
}
