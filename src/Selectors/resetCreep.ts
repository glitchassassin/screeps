export const resetCreep = (creep: Creep) => {
    const {office, type} = creep.memory
    creep.memory = {office, type};
}
