import { CachedCreep } from "WorldState/branches/WorldMyCreeps";
import { CachedResource } from "WorldState/branches/WorldResources";
import { CachedStructure } from "WorldState";
import { CachedTombstone } from "WorldState/branches/WorldTombstones";
import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { log } from "utils/logger";
import { travel } from "./Travel";
import { withdraw } from "./Withdraw";

const jobCache = new Map<string, (CachedStructure<AnyStoreStructure>|CachedTombstone|CachedCreep|CachedResource<RESOURCE_ENERGY>)>();

export const getEnergy = (creep: CachedCreep) => {
    // This needs to reference a cached source, but there is no generic WorldState "get by ID" function.
    let source = jobCache.get(creep.name);
    if (!source) {
        log('GetEnergy', `Finding source`)
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let office = global.boardroom.offices.get(creep.memory.office || '');
        if (!office) return ERR_NOT_FOUND;

        source = logisticsAnalyst.getClosestAllSources(creep.pos);
        log('GetEnergy', `${creep.name} at ${creep.pos} traveling to ${source?.pos} for energy`);
    }

    // Unable to find source?
    log('GetEnergy', `source: ${source}`);
    if (!source) return ERR_NOT_FOUND

    jobCache.set(creep.name, source);

    let result = withdraw(creep, source)
    if (result === ERR_NOT_IN_RANGE) {
        log('GetEnergy', `traveling`)
        return travel(creep, source.pos, 1);
    }
    jobCache.delete(creep.name);
    log('GetEnergy', `withdraw ${result}`)
    return result;
}
