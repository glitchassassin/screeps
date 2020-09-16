import { Mine, SourceAnalyst } from "analysts/SourceAnalyst";
import { SpawnAnalyst, SpawnData } from "analysts/Spawnanalyst";
import { EnergyRequest } from "requests/types/EnergyRequest";
import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { TaskRequest } from "tasks/TaskRequest";
import { TransferTask } from "tasks/types/TransferTask";
import { Manager } from "./Manager";

const spawnAnalyst = new SpawnAnalyst();

export class SpawnManager extends Manager {
    spawns: SpawnData[] = [];
    requests: {[id: string]: MinionRequest} = {};
    submit = (request: MinionRequest) => {
        if (!request.sourceId) return;
        if (!this.requests[request.sourceId]) {
            this.requests[request.sourceId] = request;
            console.log(`[SpawnManager] Received priority ${request.priority} spawn request from ${request.sourceId}`)
        }
    }

    load = (room: Room) => {
        // Load requests from Memory
        if (Memory.rooms[room.name]?.requests) {
            let deserialized = JSON.parse(Memory.rooms[room.name]?.requests as string)
            this.requests = {};
            for (let reqSource in deserialized) {
                this.requests[reqSource] = new MinionRequest().deserialize(JSON.parse(deserialized[reqSource]))
            }
        }
    }

    init = (room: Room) => {
        this.spawns = spawnAnalyst.getSpawns(room);

        // Request energy, if needed
        this.spawns.forEach((spawn) => {
            let capacity = room.energyAvailable
            if (capacity > 0) {
                global.managers.task.submit(new TaskRequest(spawn.spawn.id, new TransferTask(null, spawn.spawn), 10));
            }
        })
    }
    run = (room: Room) => {
        // Spawn Requests
        Object.values(this.requests)
            .sort((a, b) => (b.priority - a.priority)).forEach(r => {
            if (r.canAssign()) {
                // Find a spawn to carry out the request
                let available = this.getIdleSpawn(room);
                if (available) {
                    console.log(`[RequestManager] Delegating priority ${r.priority} ${r.constructor.name} request to ${available.spawn.name}`)
                    r.assignedTo.push(available.spawn.id);
                }
            }
            // Process assigned requests
            r.fulfill(room)
        })
    }
    cleanup = (room: Room) => {
        if (!Memory.rooms[room.name]) Memory.rooms[room.name] = { }

        let serialized: {[id: string]: string} = {};

        for (let reqSource in this.requests) {
            serialized = {};
            if (this.requests[reqSource].completed || Game.time > this.requests[reqSource].created + 500) {
                // Completed or timed out
                delete this.requests[reqSource]
            } else {
                serialized[reqSource] = this.requests[reqSource].serialize()
            }
        }
        Memory.rooms[room.name].requests = JSON.stringify(serialized);
    }

    getSpawns = (room: Room) => {
        return this.spawns;
    }
    getIdleSpawn = (room: Room) => {
        return this.spawns.find(s => !s.currentRequest);
    }
}
