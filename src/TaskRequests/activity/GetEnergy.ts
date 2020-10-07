import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { travel } from "./Travel";
import { withdraw } from "./Withdraw";

let jobCache = new Map<Id<Creep>, string>();

export const getEnergy = (creep: Creep) => {
    let sourceId = jobCache.get(creep.id);
    if (!sourceId) {
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let office = global.boardroom.offices.get(creep.memory.office || '');
        if (!office) return ERR_NOT_FOUND;

        sourceId = logisticsAnalyst.getClosestAllSources(creep.pos)?.id;
    }
    let source = Game.getObjectById(sourceId as Id<Creep|Tombstone|Resource|Structure>)
    // Unable to find source?
    if (!source) return ERR_NOT_FOUND
    let result = withdraw(creep, source)
    if (result === ERR_NOT_IN_RANGE) {
        return travel(creep, source.pos, 1);
    }
    return result;
}
