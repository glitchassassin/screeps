import { BoardroomManager } from "Boardroom/BoardroomManager";
import { MemoizeByTick } from "utils/memoize";
import { Office } from "Office/Office";
import { Structures } from "WorldState/Structures";

export class HRAnalyst extends BoardroomManager {
    @MemoizeByTick((office: Office) => office.name)
    getExtensions(office: Office) {
        return Structures.byRoom(office.center.name).filter(s => s.structureType === STRUCTURE_EXTENSION) as StructureExtension[];
    }
    @MemoizeByTick((office: Office) => office.name)
    getSpawns(office: Office) {
        return Structures.byRoom(office.center.name).filter(s => s.structureType === STRUCTURE_SPAWN) as StructureSpawn[];
    }
    @MemoizeByTick((office: Office, type?: string) => ('' + office.name + type))
    getEmployees(office: Office, type?: string, excludeSpawning = true) {
        return Object.values(Game.creeps).filter(
            creep => (
                creep.memory.office === office.name &&
                (!type || creep.memory.type === type) &&
                (!excludeSpawning || !creep.spawning)
            )
        )
    }
    @MemoizeByTick((office: Office, type?: string) => ('' + office.name + type))
    newestEmployee(office: Office, type?: string) {
        let max = undefined;
        for (let employee of this.getEmployees(office, type, false)) {
            if (employee.memory.type !== type) continue;
            if (max === undefined) {
                max = employee.ticksToLive ?? 1500;
                continue;
            }
            max = Math.max(employee.ticksToLive ?? 1500, max)
        }
        return max;
    }
    @MemoizeByTick((office: Office, type?: string) => ('' + office.name + type))
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
