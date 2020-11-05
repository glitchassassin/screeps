import { BehaviorResult } from "BehaviorTree/Behavior";
import { CachedCreep } from "WorldState/branches/WorldMyCreeps";
import { OfficeManager } from "Office/OfficeManager";
import { Request } from "BehaviorTree/Request";
import { Table } from "Visualizations/Table";
import { lazyFilter } from "utils/lazyIterators";

export class OfficeTaskManager extends OfficeManager {
    requests: Request<CachedCreep>[] = [];
    minionTypes = ['INTERN'];

    submit = (request: Request<CachedCreep>) => {
        this.requests.push(request);
    }
    run() {
        // Sort requests by priority descending
        this.requests.sort((a, b) => a.priority - b.priority);

        // Assign requests
        for (let request of this.requests) {
            // Only assign creeps up to the capacity limit
            if (request.capacityMet()) continue;

            let creeps = this.getAvailableCreeps();
            if (creeps.length === 0) break;

            for (let creep of creeps) {
                request.assign(creep);
                if (request.capacityMet()) break;
            }
        };

        // Run assigned tasks
        this.requests = this.requests.filter(request => {
            if (request.assigned.length === 0) return true; // Unassigned

            let result = request.run();
            if (result !== BehaviorResult.INPROGRESS) return false;
            return true;
        });
    }

    getAvailableCreeps = () => {
        let busyCreeps = this.requests.flatMap(r => r.assigned);
        return Array.from(lazyFilter(
            global.worldState.myCreeps.byOffice.get(this.office.name) ?? [],
            c => c.memory?.type && this.minionTypes.includes(c.memory?.type) && !busyCreeps.includes(c)
        ))
    }

    report() {
        const taskTable: any[][] = [['Request', 'Priority', 'Assigned Minions']];
        for (let req of this.requests) {
            taskTable.push([
                req.constructor.name,
                req.priority,
                req.assigned.length
            ])
        }
        Table(new RoomPosition(0, 40, this.office.center.name), taskTable);

        const idleMinions = [
            ['Minion'],
            ...this.getAvailableCreeps().map(creep => [creep.name])
        ];
        Table(new RoomPosition(40, 40, this.office.center.name), idleMinions);
    }
}
