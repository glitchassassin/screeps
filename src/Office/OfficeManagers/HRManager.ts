import { deserialize, serialize } from "class-transformer";
import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { TaskRequest } from "TaskRequests/TaskRequest";
import { HRAnalyst } from "Boardroom/BoardroomManagers/HRAnalyst";
import { table } from "table";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";
import { ResupplyTask } from "TaskRequests/types/ResupplyTask";
import { TransferTask } from "TaskRequests/types/TransferTask";
import { Table } from "Visualizations/Table";

export class HRManager extends OfficeManager {
    spawns: StructureSpawn[] = [];
    extensions: StructureExtension[] = [];
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
        try {
            let deserialized = JSON.parse(Memory.hr[this.office.center.name])
            this.requests = {};
            for (let reqSource in deserialized) {
                this.requests[reqSource] = deserialize(MinionRequest, deserialized[reqSource])
            }
        } catch {
            this.requests = {};
        }
    }
    plan() {
        if (this.status === OfficeManagerStatus.OFFLINE) return;
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        // Enroll any newly hired creeps, if they are not already on the list
        this.spawns = hrAnalyst.getSpawns(this.office);
        this.extensions = hrAnalyst.getExtensions(this.office)

        let priority = 5;

        switch (this.status) {
            case OfficeManagerStatus.MINIMAL:
                priority = 6;
                break;
            case OfficeManagerStatus.NORMAL:
                priority = 7;
                break;
            case OfficeManagerStatus.PRIORITY:
                priority = 8;
                break;
        }

        this.extensions.forEach(e => {
            let energy = getTransferEnergyRemaining(e);
            if (energy && energy > 0) {
                this.office.submit(new TaskRequest(e.id, new ResupplyTask(e), priority, energy));
            }
        })
        this.spawns.forEach((spawn) => {
            let roomCapacity = spawn.room.energyAvailable
            let spawnCapacity = getTransferEnergyRemaining(spawn);
            if (!spawnCapacity) return;
            if (spawnCapacity > 0) {
                this.office.submit(new TaskRequest(spawn.id, new ResupplyTask(spawn), priority, spawnCapacity));
            }
        })
    }
    run() {
        // Spawn Requests
        Object.values(this.requests)
            .sort((a, b) => (b.priority - a.priority)).forEach(r => {
            if (!r.assignedTo) {
                // Find a spawn to carry out the request
                let available = this.getIdleSpawn();
                if (available) {
                    r.assignedTo = available.id;
                }
            }
            // Process assigned requests
            r.fulfill(this.office);
        })
        if (global.v.hr.state) {
            this.report();
        }
    }
    report() {
        let employeeData = new Map<string, number>();
        this.office.employees.forEach(e => {
            let t = e.memory.type || 'NONE'
            employeeData.set(t, (employeeData.get(t) || 0) + 1);
        })
        let employeeTable = [
            ['Role', 'Count'],
            ...employeeData.entries()
        ]
        Table(new RoomPosition(2, 2, this.office.center.name), employeeTable);

        let headers = ['Source', 'Role', 'Priority', 'Assigned']
        let requests = Object.values(this.requests)
        let rows = requests.map(r => {
            return [
                Game.getObjectById(r.sourceId as Id<any>)?.toString() || r.sourceId,
                r.type,
                r.priority,
                r.assignedTo || ''
            ];
        });
        Table(new RoomPosition(15, 2, this.office.center.name), [headers, ...rows]);
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
        return this.spawns.find(s => !Object.values(this.requests).some(r => r.assignedTo === s.id));
    }
}
