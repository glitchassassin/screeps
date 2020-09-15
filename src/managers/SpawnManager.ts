import { Mine, SourceAnalyst } from "analysts/SourceAnalyst";
import { SpawnAnalyst, SpawnData } from "analysts/Spawnanalyst";
import { EnergyRequest } from "requests/types/EnergyRequest";
import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { Request } from "requests/Request";
import { Manager } from "./Manager";
import { RequestManager } from "./RequestManager";

const spawnAnalyst = new SpawnAnalyst();

export class SpawnManager extends Manager {
    spawns: SpawnData[] = [];
    init = (room: Room) => {
        this.spawns = spawnAnalyst.getSpawns(room);

        // Request energy, if needed
        this.spawns.forEach((spawn) => {
            let capacity = spawn.spawn.store.getFreeCapacity(RESOURCE_ENERGY)
            if (capacity > 0) {
                global.managers.request.submit(new EnergyRequest(spawn.spawn.id, 5, spawn.spawn, capacity))
            }
        })
    }
    run = (room: Room) => {
        // no action needed
    }

    getSpawns = (room: Room) => {
        return this.spawns;
    }
}
