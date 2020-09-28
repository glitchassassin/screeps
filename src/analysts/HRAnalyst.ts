import { Office } from "Office/Office";
import { Memoize } from "typescript-memoize";
import { Analyst } from "./Analyst";

export class HRAnalyst extends Analyst {
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getExtensions(office: Office) {
        return office.center.room.find(FIND_STRUCTURES)
            .filter(s => s.structureType === STRUCTURE_EXTENSION) as StructureExtension[];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getSpawns(office: Office) {
        return office.center.room.find(FIND_MY_SPAWNS);
    }
}
