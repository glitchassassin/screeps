import { SpawnAnalyst, SpawnData } from "analysts/Spawnanalyst";
import { deserialize, serialize } from "class-transformer";
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
        this.spawns = spawnAnalyst.getSpawns(room);
        // Load requests from Memory
        if (Memory.rooms[room.name]?.spawnRequests) {
            let deserialized = JSON.parse(Memory.rooms[room.name]?.spawnRequests as string)
            this.requests = {};
            for (let reqSource in deserialized) {
                this.requests[reqSource] = deserialize(MinionRequest, deserialized[reqSource])
                if (this.requests[reqSource].assignedTo) {
                    this.spawns.find(s => s.spawn.id === this.requests[reqSource].assignedTo?.id)
                }
            }
        }
    }

    init = (room: Room) => {

        // Request energy, if needed
        this.spawns.forEach((spawn) => {
            let capacity = room.energyAvailable
            if (capacity < 200) {
                global.managers.task.submit(new TaskRequest(spawn.spawn.id, new TransferTask(spawn.spawn), 10));
            } else if (capacity < room.energyCapacityAvailable) {
                global.managers.task.submit(new TaskRequest(spawn.spawn.id, new TransferTask(spawn.spawn), 5));
            }
        })
    }
    run = (room: Room) => {
        // Spawn Requests
        Object.values(this.requests)
            .sort((a, b) => (b.priority - a.priority)).forEach(r => {
            if (!r.assignedTo) {
                // Find a spawn to carry out the request
                let available = this.getIdleSpawn(room);
                if (available) {
                    // console.log(`[RequestManager] Delegating priority ${r.priority} ${r.constructor.name} request to ${available.spawn.name}`)
                    r.assignedTo = available.spawn;
                    available.currentRequest = r;
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
                serialized[reqSource] = serialize(this.requests[reqSource])
            }
        }
        Memory.rooms[room.name].spawnRequests = JSON.stringify(serialized);
    }

    getSpawns = (room: Room) => {
        return this.spawns;
    }
    getIdleSpawn = (room: Room) => {
        return this.spawns.find(s => !s.currentRequest);
    }
}
