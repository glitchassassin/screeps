import { BehaviorResult } from "BehaviorTree/Behavior";
import { HRAnalyst } from "Analysts/HRAnalyst";
import { MapAnalyst } from "Analysts/MapAnalyst";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { Table } from "screeps-viz";
import { log } from "utils/logger";

export class OfficeTaskManager extends OfficeManager {
    requests: MinionRequest[] = [];
    minionTypes = ['INTERN'];

    requestsTable = Table(() => ({
        data: this.requests.map(req => [
            req.constructor.name,
            req.pos.toString(),
            req.priority,
            req.assigned.length
        ]),
        config: {
            headers: ['Request', 'Location', 'Priority', 'Assigned Minions'],
        }
    }))

    idleMinionsTable = Table(() => ({
        data: this.getAvailableCreeps().map(creep => [creep.name]),
        config: {
            headers: ['Minion'],
        }
    }))

    submit = (request: MinionRequest) => {
        this.requests.push(request);
    }
    run() {
        log(this.constructor.name, `.run CPU: ${Game.cpu.getUsed()}`)
        // Sort requests by priority descending, then by proximity to spawn
        let target = this.office.controller.pos;

        log(this.constructor.name, `.run assigning ${this.getAvailableCreeps().length} minions...`)
        if (this.getAvailableCreeps().length > 0) {
            this.requests.sort((a, b) => {
                let p = b.priority - a.priority;
                if (p !== 0) return p;
                return MapAnalyst.sortByDistanceTo(target)(a, b);
            });

            // Assign requests
            for (let request of this.requests) {
                // Only assign creeps up to the capacity limit
                if (request.capacityMet()) continue;

                let creeps = this.getAvailableCreeps();
                if (creeps.length === 0) break;

                creeps.sort(MapAnalyst.sortByDistanceTo(request.pos));

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
        let busyCreeps = this.requests.flatMap(r => r.assigned);
        return HRAnalyst.getEmployees(this.office).filter(
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
        return HRAnalyst.getEmployees(this.office).filter(
            c => (
                c.memory?.type &&
                this.minionTypes.includes(c.memory?.type) &&
                (c.ticksToLive ?? 0) < ttl &&
                (!ifRequestIsNotHandled || this.requests.find(r => r.assigned.includes(c.id) && r.assigned.length === 1))
            )
        )
    }
}
