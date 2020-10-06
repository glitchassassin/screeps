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

        let distance: {[id: string]: number} = {};
        sourceId = logisticsAnalyst.getAllSources(office).sort((a, b) => {
            if (!distance[a.id]) { distance[a.id] = PathFinder.search(creep.pos, {pos: a.pos, range: 1}).cost }
            if (!distance[b.id]) { distance[b.id] = PathFinder.search(creep.pos, {pos: b.pos, range: 1}).cost }
            return (distance[a.id] - distance[b.id])
        })[0]?.id;
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
