export const carryPartsForFranchiseRoute = (roomIsOwned: boolean, routeLength: number) => {
    const roundTripDistance = routeLength * 1.5;
    let energyCapacity = (roomIsOwned) ? SOURCE_ENERGY_CAPACITY : SOURCE_ENERGY_NEUTRAL_CAPACITY;
    const targetCapacity = (energyCapacity / ENERGY_REGEN_TIME) * roundTripDistance;
    return Math.ceil(targetCapacity / CARRY_CAPACITY);
}
