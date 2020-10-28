import { CachedCreep } from "WorldState/branches/WorldCreeps";
import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { log } from "utils/logger";
import { travel } from "./Travel";
import { withdraw } from "./Withdraw";

const jobCache = new Map<string, string>();

export const getEnergy = (creep: CachedCreep) => {
    // This needs to reference a cached source, but there is no generic WorldState "get by ID" function.
    let source = Game.getObjectById(jobCache.get(creep.name) as Id<Creep|Tombstone|Resource|Structure>);
    if (!source) {
        log('GetEnergy', `Finding source`)
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let office = global.boardroom.offices.get(creep.memory.office || '');
        if (!office) return ERR_NOT_FOUND;

        source = logisticsAnalyst.getClosestAllSources(creep.pos) ?? null;
        log('GetEnergy', `${creep.name} at ${creep.pos} traveling to ${source?.pos} for energy`);
    }

    // Unable to find source?
    log('GetEnergy', `source: ${source}`);
    if (!source) return ERR_NOT_FOUND

    jobCache.set(creep.name, source.id);

    let result = withdraw(creep, source)
    if (result === ERR_NOT_IN_RANGE) {
        log('GetEnergy', `traveling`)
        return travel(creep, source.pos, 1);
    }
    jobCache.delete(creep.name);
    log('GetEnergy', `withdraw ${result}`)
    return result;
}
