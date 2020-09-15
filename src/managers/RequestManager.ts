import { LogisticsAnalyst } from "analysts/LogisticsAnalyst";
import { Request } from "requests/Request";
import { requestTypes } from "requests/RequestTypes";
import { BuildRequest } from "requests/types/BuildRequest";
import { EnergyRequest } from "requests/types/EnergyRequest";
import { MinionRequest } from "requests/types/MinionRequest";
import { UpgradeRequest } from "requests/types/UpgradeRequest";
import { Manager } from "./Manager";
import { SpawnManager } from "./SpawnManager";
import { TaskManager } from "./TaskManager";

let logisticsAnalyst = new LogisticsAnalyst();

type RequestsMap<T> = {
    [id: string]: {
        [id: string]: T
    }
}

type CreepAssignment = {
    creep: Creep,
    request: Request,
    priority: number
}

export class RequestManager extends Manager {
    requests: RequestsMap<Request> = {
        EnergyRequest: {},
        MinionRequest: {},
        BuildRequest: {}
    };
    idleCreeps: Creep[] = [];
    assignedCreeps: CreepAssignment[] = [];

    submit = (request: Request) => {
        if (!request.sourceId) return;
        if (this.requests[request.constructor.name] === undefined) {
            this.requests[request.constructor.name] = {};
        }
        if (!this.requests[request.constructor.name][request.sourceId]) {
            this.requests[request.constructor.name][request.sourceId] = request;
            console.log(`[RequestManager] Received priority ${request.priority} ${request.constructor.name} request from ${request.sourceId}`)
        }
    }

    load = (room: Room) => {
        // Load tasks from Memory
        if (Memory.rooms[room.name]?.requests) {
            let deserialized = JSON.parse(Memory.rooms[room.name]?.requests as string)
            for (let reqType in deserialized) {
                this.requests[reqType] = {};
                for (let reqSource in deserialized[reqType]) {
                    this.requests[reqType][reqSource] = new requestTypes[reqType]().deserialize(JSON.parse(deserialized[reqType][reqSource]))
                }
            }
        }
    }

    init = (room: Room) => {
        this.idleCreeps = room.find(FIND_MY_CREEPS).filter(creep =>
            global.managers.task.isIdle(creep) && this.isIdle(creep.id)
        );
        this.assignedCreeps = [];
        [
            ...Object.values(this.requests.EnergyRequest),
            ...Object.values(this.requests.UpgradeRequest),
            ...Object.values(this.requests.BuildRequest),
        ].forEach(request => {
            request.assignedTo.forEach(creepId => {
                let creep = Game.getObjectById(creepId as Id<Creep>);
                if (!creep) return;
                this.assignedCreeps.push({
                    creep,
                    request,
                    priority: request.priority
                })
            })
        })
        // Sort from least important to most important
        this.assignedCreeps.sort((a, b) => (a.priority - b.priority));
    }
    run = (room: Room) => {
        // Creep requests
        [
            ...Object.values(this.requests.EnergyRequest),
            ...Object.values(this.requests.UpgradeRequest),
            ...Object.values(this.requests.BuildRequest),
        ].sort((a, b) => (b.priority - a.priority)).forEach(r => {
            if (!(r instanceof EnergyRequest || r instanceof UpgradeRequest || r instanceof BuildRequest)) return;
            // Assign unassigned requests
            if (r.canAssign()) {
                // Find a creep to carry out the request
                let creep = this.idleCreeps
                    .find(c => c.store.getCapacity() > 0)
                if (creep) {
                    console.log(`[RequestManager] Delegating priority ${r.priority} ${r.constructor.name} request to ${creep.name}`)
                    r.assignedTo.push(creep.id);
                    this.idleCreeps = this.idleCreeps.filter(c => c.id !== (creep as Creep).id)
                } else if (this.assignedCreeps.length > 0 && r.priority > this.assignedCreeps[0].priority) {
                    // No idle creeps, so reallocate from lower-priority requests
                    this.assignedCreeps[0].request.assignedTo = this.assignedCreeps[0].request.assignedTo.filter(id => id !== this.assignedCreeps[0].creep.id)
                    r.assignedTo.push(this.assignedCreeps[0].creep.id);
                }
            }

            // Process assigned requests
            r.fulfill(room)
        })

        // Spawn Requests
        Object.values(this.requests.MinionRequest)
            .sort((a, b) => (b.priority - a.priority)).forEach(r => {
            if (!(r instanceof MinionRequest)) return
            if (r.canAssign()) {
                // Find a spawn to carry out the request
                let available = global.managers.spawn.getSpawns(room).find(s => this.isIdle(s.spawn.id));
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

        let serialized: RequestsMap<string> = {};

        for (let reqType in this.requests) {
            serialized[reqType] = {};
            for (let reqSource in this.requests[reqType]) {
                if (!this.requests[reqType][reqSource].completed) {
                    serialized[reqType][reqSource] = this.requests[reqType][reqSource].serialize()
                } else {
                    delete this.requests[reqType][reqSource]
                }
            }
        }
        Memory.rooms[room.name].requests = JSON.stringify(serialized);
    }
    isIdle = (id: string) => {
        for (let reqType in this.requests) {
            for (let reqSource in this.requests[reqType]) {
                if (this.requests[reqType][reqSource].assignedTo.includes(id)) {
                    return false;
                }
            }
        }
        return true;
    }
}
