import { Request } from "requests/Request";
import { Analyst } from "./Analyst";
import { MapAnalyst } from "./MapAnalyst";

const mapAnalyst = new MapAnalyst();

export type SpawnData = {
    spawn: StructureSpawn,
    energy: number,
    currentRequest?: Request
}

export class SpawnAnalyst extends Analyst {
    getSpawns = (room: Room) => {
        return room.find(FIND_MY_SPAWNS).map(spawn => {
            let energy = spawn.store.getUsedCapacity(RESOURCE_ENERGY);
            return {
                spawn,
                energy
            }
        });
    }
}
