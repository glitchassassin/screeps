import { Request } from "requests/Request";
import { TaskRequest } from "tasks/TaskRequest";
import { Memoize } from "typescript-memoize";
import { Analyst } from "./Analyst";
import { MapAnalyst } from "./MapAnalyst";

const mapAnalyst = new MapAnalyst();

export type SpawnData = {
    spawn: StructureSpawn,
    energy: number,
    currentRequest?: Request
}

export class SpawnAnalyst extends Analyst {
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getExtensions(room: Room) {
        return room.find(FIND_STRUCTURES)
            .filter(s => s.structureType === STRUCTURE_EXTENSION) as StructureExtension[];
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getSpawns(room: Room) {
        return room.find(FIND_MY_SPAWNS);
    }
}
