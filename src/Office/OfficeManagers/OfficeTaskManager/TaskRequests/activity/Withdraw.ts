import { CachedCreep } from "WorldState/branches/WorldMyCreeps";
import { CachedResource } from "WorldState/branches/WorldResources";
import { CachedStructure } from "WorldState";
import { CachedTombstone } from "WorldState/branches/WorldTombstones";

export const withdraw = (creep: CachedCreep, target: CachedStructure|CachedTombstone|CachedResource|CachedCreep, amount: number|undefined = undefined) => {
    if (!target || !target.gameObj) return ERR_NOT_FOUND;

    if (target instanceof CachedResource) {
        return creep.gameObj.pickup(target.gameObj);
    } else if (target instanceof CachedCreep) {
        return target.gameObj.transfer(creep.gameObj, RESOURCE_ENERGY, amount);
    } else {
        return creep.gameObj.withdraw(target.gameObj, RESOURCE_ENERGY, amount);
    }
}
