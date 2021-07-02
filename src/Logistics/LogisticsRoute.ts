import { DepotRequest, LogisticsRequest } from "./LogisticsRequest";

import { Capacity } from "WorldState/Capacity";
import { LogisticsSource } from "./LogisticsSource";
import { MapAnalyst } from "Analysts/MapAnalyst";
import { Office } from "Office/Office";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { byId } from "utils/gameObjectSelectors";
import { log } from "utils/logger";

enum RouteState {
    PENDING = 'PENDING',
    GETTING_ENERGY = 'GETTING_ENERGY',
    FULFILLING = 'FULFILLING',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED'
}

export class LogisticsRoute {
    // Dependencies
    private statisticsAnalyst: StatisticsAnalyst;

    public length = Infinity;
    public state = RouteState.PENDING;
    source?: LogisticsSource;
    requests: LogisticsRequest[];
    public maxCapacity: number = 0;
    public capacity: number = 0;
    public assignedCapacity = new Map<LogisticsRequest, number>();
    public reservedCapacity = 0;
    public began: number = -1;

    public creepId: Id<Creep>;

    public get creep() { return byId(this.creepId) }

    public get completed() {
        return this.state === RouteState.COMPLETED || this.state === RouteState.CANCELLED;
    }

    constructor(public office: Office, creep: Creep, request: LogisticsRequest, sources: LogisticsSource[]) {
        // Set up dependencies
        this.statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
        this.requests = [request];
        this.creepId = creep.id;
        this.office = office;
        this.init(creep, request, sources);
    }
    init(creep: Creep, request: LogisticsRequest, sources: LogisticsSource[]) {
        // Get shortest route to source and then request
        let capacity = Capacity.byId(creep.id)
        if ((capacity?.used ?? 1) / (capacity?.capacity ?? 1) < 0.8) {
            let prioritySources = this.calcPrioritySources(creep, request, sources);
            this.calcInitialPath(creep, request, prioritySources);
        }

        this.calcInitialCapacity(creep, request);
    }
    calcPrioritySources(creep: Creep, request: LogisticsRequest, sources: LogisticsSource[]) {
        let creepCapacity = Capacity.byId(creep.id)?.free ?? 0;
        let fullCreepSources: LogisticsSource[] = [];
        let fullRequestSources: LogisticsSource[] = [];
        let validSources: LogisticsSource[] = [];
        for (let source of sources) {
            if (request.sourceType !== source.sourceType) continue;

            if (source.capacity > creepCapacity) {
                fullCreepSources.push(source);
            } else if (source.capacity > request.capacity) {
                fullRequestSources.push(source);
            } else if (source.capacity > 0) {
                validSources.push(source);
            }
        }

        let prioritySources = (fullCreepSources.length > 0) ? fullCreepSources : (fullRequestSources.length > 0) ? fullRequestSources : validSources;
        return prioritySources;
    }
    calcInitialPath(creep: Creep, request: LogisticsRequest, prioritySources: LogisticsSource[]) {
        // Find shortest path from creep -> source -> request
        prioritySources.forEach(source => {
            let distance = MapAnalyst.getRangeTo(creep.pos, source.pos) + MapAnalyst.getRangeTo(source.pos, request.pos);
            if (distance < this.length) {
                this.source = source;
                this.length = distance;
            }
        })
    }
    calcInitialCapacity(creep: Creep, request: LogisticsRequest) {
        let capacity = Capacity.byId(creep.id)
        this.maxCapacity = Math.min(capacity?.capacity ?? 0, (capacity?.used ?? 0) + (this.source?.capacity ?? 0));
        this.assignedCapacity.set(request, Math.min(this.maxCapacity, request.capacity));
        if (request instanceof DepotRequest) {
            this.capacity = 0;
        } else {
            this.capacity = this.maxCapacity - request.capacity;
        }
    }

    extend(request: LogisticsRequest) {
        if (this.capacity > 0) {
            if (request.sourceType !== this.source?.sourceType) {
                return false;
            }
            if (request.completed) {
                return false;
            }
            this.requests.push(request);
            this.assignedCapacity.set(request, Math.min(this.capacity, request.capacity));
            if (request instanceof DepotRequest) {
                // Don't try to assign other requests after a DepotRequest
                this.capacity = 0;
                return true;
            } else {
                this.capacity -= request.capacity;
            }
            return true;
        }
        return false;
    }

    commit() {
        if (!this.creep) return false;
        if (!this.requests || this.requests.length === 0) return false;

        if (this.source) {
            // Reserve capacity at the source
            this.reservedCapacity = 0;
            for (let v of this.assignedCapacity.values()) {
                this.reservedCapacity += v;
            }
            this.source.reserve(this.reservedCapacity);
            this.setState(RouteState.GETTING_ENERGY);
        } else {
            // We have 80% capacity already, go straight to filling orders
            this.setState(RouteState.FULFILLING);
        }
        // Assign requests
        this.requests.forEach(r => {
            r.assigned = true;
            r.assignedCapacity += this.assignedCapacity.get(r) ?? 0
        });

        this.began = Game.time;

        return true;
    }

    setState(s: RouteState) {
        if (this.state === s) return;
        log('LogisticsRoute', `${this.creep?.name} switching to ${s}`)
        // If creep has not withdrawn, cancel reservation
        if (this.state === RouteState.GETTING_ENERGY) {
            this.source?.unreserve(this.reservedCapacity)
        }
        if (s === RouteState.CANCELLED) {
            // Unassign remaining requests
            this.requests.forEach(r => {
                r.assigned = false;
                r.assignedCapacity -= this.assignedCapacity.get(r) ?? 0
            });
        }
        this.state = s;
    }

    run() {
        // Validate current state
        if (!this.creep) { // Creep not found
            log('LogisticsRoute', `Creep not found, canceling route`)
            this.setState(RouteState.CANCELLED);
            return;
        }
        // Change state, if appropriate
        switch(this.state) {
            case RouteState.GETTING_ENERGY: {
                if (!(Capacity.byId(this.creepId)?.free === 0 || this.source?.capacity === 0)) {
                    break;
                }
                this.setState(RouteState.FULFILLING);
            }
            // This step done - falls through to the next
            case RouteState.FULFILLING: {
                // Discard any completed requests
                while (this.requests.length > 0 && this.requests[0].completed) {
                    this.requests.shift();
                }
                // If the queue is empty, we're done
                if (this.requests.length === 0) {
                    this.setState(RouteState.COMPLETED);
                }
            }
        }
        // Execute state
        switch(this.state) {
            case RouteState.PENDING: // falls through
            case RouteState.COMPLETED: // falls through
            case RouteState.CANCELLED: {
                return;
            }
            case RouteState.GETTING_ENERGY: {
                if (!this.source) {
                    this.setState(RouteState.CANCELLED);
                    return;
                }
                let result = this.source.transfer(this.creep, this.reservedCapacity);
                log('LogisticsRoute', `${this.creep.name} transferring from source ${this.source.pos}: ${result}`)
                if (result !== OK) {
                    this.setState(RouteState.CANCELLED);
                }
                break;
            }
            case RouteState.FULFILLING: {
                let result = this.requests[0].action(this.creep);
                log('LogisticsRoute', `${this.creep.name} fulfilling ${this.requests[0].constructor.name} at ${this.requests[0].pos}: ${result}`)
                if (result === ERR_NOT_ENOUGH_RESOURCES) {
                    this.setState(RouteState.COMPLETED);
                } else if (result !== OK) {
                    this.setState(RouteState.CANCELLED);
                }
                break;
            }
        }
    }
}

// profiler.registerClass(LogisticsRoute, 'LogisticsRoute');
