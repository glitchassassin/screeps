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
        return Array.from(global.worldState.mySpawns.byRoom.get(office.center.name) ?? []);
    }
    @Memoize((office: Office, type?: string) => ('' + office.name + type + Game.time))
    getEmployees(office: Office, type?: string) {
        return Array.from(lazyFilter(
            global.worldState.myCreeps.byOffice.get(office.name) ?? [],
            creep => !type || creep.memory?.type === type
        ))
    }
    @Memoize((office: Office, type?: string) => ('' + office.name + type + Game.time))
    newestEmployee(office: Office, type?: string) {
        let max = undefined;
        for (let employee of global.worldState.myCreeps.byOffice.get(office.name) ?? []) {
            if (employee.memory.type !== type) continue;
            if (max === undefined) {
                max = employee.gameObj.ticksToLive;
                continue;
            }
            max = Math.max(employee.gameObj.ticksToLive ?? 0, max)
        }
        return max;
    }
    @Memoize((office: Office, type?: string) => ('' + office.name + type + Game.time))
    oldestEmployee(office: Office, type?: string) {
        let min = undefined; // Max actual TTL should be 1500
        for (let employee of global.worldState.myCreeps.byOffice.get(office.name) ?? []) {
            if (employee.memory.type !== type) continue;
            if (min === undefined) {
                min = employee.gameObj.ticksToLive;
                continue;
            }
            min = Math.min(employee.gameObj.ticksToLive ?? 0, min)
        }
        return min;
    }
}
