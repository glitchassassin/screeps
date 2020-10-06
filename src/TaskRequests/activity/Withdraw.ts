export const withdraw = (creep: Creep, target: Structure|Tombstone|Resource|Creep, amount: number|undefined = undefined) => {
    if (!target || !Game.getObjectById(target.id as Id<any>)) return ERR_NOT_FOUND;

    if (target instanceof Resource) {
        return creep.pickup(target);
    } else if (target instanceof Creep) {
        return target.transfer(creep, RESOURCE_ENERGY, amount)
    } else {
        return creep.withdraw(target, RESOURCE_ENERGY, amount);
    }
}
