import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Memoize } from "typescript-memoize";
import { Office } from "Office/Office";
import { Structures } from "WorldState/Structures";

export class HRAnalyst extends BoardroomManager {
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getExtensions(office: Office) {
        return Structures.byRoom(office.center.name).filter(s => s.structureType === STRUCTURE_EXTENSION) as StructureExtension[];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getSpawns(office: Office) {
        return Structures.byRoom(office.center.name).filter(s => s.structureType === STRUCTURE_SPAWN) as StructureSpawn[];
    }
    @Memoize((office: Office, type?: string) => ('' + office.name + type + Game.time))
    getEmployees(office: Office, type?: string, excludeSpawning = true) {
        return Object.values(Game.creeps).filter(
            creep => (
                creep.memory.office === office.name &&
                (!type || creep.memory.type === type) &&
                (!excludeSpawning || !creep.spawning)
            )
        )
    }
    @Memoize((office: Office, type?: string) => ('' + office.name + type + Game.time))
    newestEmployee(office: Office, type?: string) {
        let max = undefined;
        for (let employee of this.getEmployees(office, type)) {
            if (employee.memory.type !== type) continue;
            if (max === undefined) {
                max = employee.ticksToLive ?? 1500;
                continue;
            }
            max = Math.max(employee.ticksToLive ?? 1500, max)
        }
        return max;
    }
    @Memoize((office: Office, type?: string) => ('' + office.name + type + Game.time))
    oldestEmployee(office: Office, type?: string) {
        let min = undefined; // Max actual TTL should be 1500
        for (let employee of this.getEmployees(office, type)) {
            if (employee.memory.type !== type) continue;
            if (min === undefined) {
                min = employee.ticksToLive;
                continue;
            }
            min = Math.min(employee.ticksToLive ?? 0, min)
        }
        return min;
    }
}
