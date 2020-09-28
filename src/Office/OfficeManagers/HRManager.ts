import { deserialize, serialize } from "class-transformer";
import { OfficeManager } from "Office/OfficeManager";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { TaskRequest } from "TaskRequests/TaskRequest";

export class HRManager extends OfficeManager {
    spawns: StructureSpawn[] = [];
    requests: {[id: string]: MinionRequest} = {};
    resupply: TaskRequest|null = null;

    submit = (request: MinionRequest) => {
        if (!request.sourceId) return;
        if (!this.requests[request.sourceId]) {
            this.requests[request.sourceId] = request;
        }
    }

    init() {
        // Load requests from Memory
        if (Memory.hr[this.office.center.name]) {
            let deserialized = JSON.parse(Memory.hr[this.office.center.name])
            this.requests = {};
            for (let reqSource in deserialized) {
                this.requests[reqSource] = deserialize(MinionRequest, deserialized[reqSource])
            }
        }
    }
    plan() {
        // Enroll any newly hired creeps, if they are not already on the list
        this.office.center.room.find(FIND_MY_CREEPS).forEach(c => this.office.enrollEmployee(c));
    }
    run() {
        // Spawn Requests
        Object.values(this.requests)
            .sort((a, b) => (b.priority - a.priority)).forEach(r => {
            if (!r.assignedTo) {
                // Find a spawn to carry out the request
                let available = this.getIdleSpawn();
                if (available) {
                    r.assignedTo = available;
                }
            }
            // Process assigned requests
            r.fulfill(this.office);
        })
    }
    cleanup() {
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
        Memory.hr[this.office.center.name] = JSON.stringify(serialized);
    }

    getIdleSpawn = () => {
        return this.spawns.find(s => !Object.values(this.requests).some(r => r.assignedTo === s));
    }
}
