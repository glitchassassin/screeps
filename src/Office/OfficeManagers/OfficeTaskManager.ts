import { BehaviorResult } from "BehaviorTree/Behavior";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { Table } from "Visualizations/Table";
import { lazyFilter } from "utils/lazyIterators";
import { sortByDistanceTo } from "utils/gameObjectSelectors";

export class OfficeTaskManager extends OfficeManager {
    requests: MinionRequest[] = [];
    minionTypes = ['INTERN'];

    submit = (request: MinionRequest) => {
        this.requests.push(request);
    }
    run() {
        // Sort requests by priority descending, then by proximity to spawn
        let spawn = global.worldState.mySpawns.byRoom.get(this.office.name)?.values().next().value;
        let target = (spawn? spawn.pos : new RoomPosition(25, 25, this.office.name)) as RoomPosition;

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

                for (let creep of creeps) {
                    request.assign(creep);
                    if (request.capacityMet()) break;
                }
            }
        }

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
        return Array.from(lazyFilter(
            global.worldState.myCreeps.byOffice.get(this.office.name) ?? [],
            c => (
                c.memory?.type &&
                this.minionTypes.includes(c.memory?.type) &&
                (c.gameObj.ticksToLive ?? 0) < ttl &&
                (!ifRequestIsNotHandled || this.requests.find(r => r.assigned.includes(c) && r.assigned.length === 1))
            )
        ))
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
