import { SpawnAnalyst, SpawnData } from "analysts/SpawnAnalyst";
import { deserialize, serialize } from "class-transformer";
import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { TaskRequest } from "tasks/TaskRequest";
import { TransferTask } from "tasks/types/TransferTask";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";
import { Manager } from "../managers/Manager";

export class SpawnSupervisor extends Manager {
    spawns: SpawnData[] = [];
    requests: {[id: string]: MinionRequest} = {};
    resupply: TaskRequest|null = null;
    submit = (request: MinionRequest) => {
        if (!request.sourceId) return;
        if (!this.requests[request.sourceId]) {
            this.requests[request.sourceId] = request;
        }
    }

    load = (room: Room) => {
        this.spawns = global.analysts.spawn.getSpawns(room);
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
    run = (room: Room) => {
        // Spawn Requests
        Object.values(this.requests)
            .sort((a, b) => (b.priority - a.priority)).forEach(r => {
            if (!r.assignedTo) {
                // Find a spawn to carry out the request
                let available = this.getIdleSpawn(room);
                if (available) {
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

    getIdleSpawn = (room: Room) => {
        return this.spawns.find(s => !s.currentRequest);
    }
}
