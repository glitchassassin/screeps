import { BoardroomManager } from "Boardroom/BoardroomManager";
import { CachedStructure } from "WorldState";
import { Memoize } from "typescript-memoize";
import { Office } from "Office/Office";
import { lazyFilter } from "utils/lazyIterators";

export class HRAnalyst extends BoardroomManager {
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getExtensions(office: Office) {
        let structures = global.worldState.structures.byRoom.get(office.center.name) ?? [];
        return Array.from(lazyFilter(structures, s => s.structureType === STRUCTURE_EXTENSION)) as CachedStructure<StructureExtension>[];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getSpawns(office: Office) {
        return Array.from(global.worldState.mySpawns.byRoom.get(office.center.name) ?? []) as CachedStructure<StructureSpawn>[];
    }
    @Memoize((office: Office, type?: string) => ('' + office.name + type + Game.time))
    getEmployees(office: Office, type?: string) {
        return Array.from(lazyFilter(
            global.worldState.myCreeps.byOffice.get(office.name) ?? [],
            creep => !type || creep.memory?.type === type
        ))
    }
}
