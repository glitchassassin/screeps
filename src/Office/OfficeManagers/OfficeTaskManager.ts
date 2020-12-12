import { BehaviorResult } from "BehaviorTree/Behavior";
import { HRAnalyst } from "Boardroom/BoardroomManagers/HRAnalyst";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { Table } from "Visualizations/Table";
import { log } from "utils/logger";
import { sortByDistanceTo } from "utils/gameObjectSelectors";

export class OfficeTaskManager extends OfficeManager {
    requests: MinionRequest[] = [];
    minionTypes = ['INTERN'];

    submit = (request: MinionRequest) => {
        this.requests.push(request);
    }
    run() {
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        log(this.constructor.name, `.run CPU: ${Game.cpu.getUsed()}`)
        // Sort requests by priority descending, then by proximity to spawn
        let [spawn] = hrAnalyst.getSpawns(this.office);
        let target = (spawn? spawn.pos : new RoomPosition(25, 25, this.office.name)) as RoomPosition;

        log(this.constructor.name, `.run assigning ${this.getAvailableCreeps().length} minions...`)
        if (this.getAvailableCreeps().length > 0) {
            this.requests.sort((a, b) => {
                let p = b.priority - a.priority;
                if (p !== 0) return p;
                return sortByDistanceTo(target)(a, b);
            });

            // Assign requests
            for (let request of this.requests) {
                // Only assign creeps up to the capacity limit
                if (request.capacityMet()) continue;

                let creeps = this.getAvailableCreeps();
                if (creeps.length === 0) break;

                creeps.sort(sortByDistanceTo(request.pos));

                for (let creep of creeps) {
                    request.assign(creep);
                    if (request.capacityMet()) break;
                }
            }
        }
        log(this.constructor.name, `.run assigning minions CPU: ${Game.cpu.getUsed()}`)

        // Run assigned tasks
        log(this.constructor.name, `.run executing ${this.requests.length} requests...`)
        this.requests = this.requests.filter(request => {
            if (request.assigned.length === 0) return true; // Unassigned

            let result = request.run();
            if (result !== BehaviorResult.INPROGRESS) return false;
            return true;
        });
        log(this.constructor.name, `.run executing requests CPU: ${Game.cpu.getUsed()}`)
    }

    getAvailableCreeps = () => {
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let busyCreeps = this.requests.flatMap(r => r.assigned);
        return hrAnalyst.getEmployees(this.office).filter(
            c => c.memory?.type && this.minionTypes.includes(c.memory?.type) && !busyCreeps.includes(c.id)
        )
    }

    /**
     * Returns minions that are expiring within `ttl` ticks (optionally, filters
     * based on whether they are the only minions assigned to the given request.)
     *
     * Important for Salesman minions
     *
     * @param ttl Ticks to live threshold
     * @param ifRequestIsNotHandled If true, ignores minions whose request has backup coverage
     */
    creepsExpiring = (ttl: number, ifRequestIsNotHandled = true) => {
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        return hrAnalyst.getEmployees(this.office).filter(
            c => (
                c.memory?.type &&
                this.minionTypes.includes(c.memory?.type) &&
                (c.ticksToLive ?? 0) < ttl &&
                (!ifRequestIsNotHandled || this.requests.find(r => r.assigned.includes(c.id) && r.assigned.length === 1))
            )
        )
    }

    report() {
        const taskTable: any[][] = [['Request', 'Location', 'Priority', 'Assigned Minions']];
        for (let req of this.requests) {
            taskTable.push([
                req.constructor.name,
                req.pos.toString(),
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
