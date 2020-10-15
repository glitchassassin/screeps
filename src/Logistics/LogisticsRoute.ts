import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";
import { PipelineMetrics, StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { Office } from "Office/Office";
import profiler from "screeps-profiler";
import { DepotRequest, LogisticsRequest, ResupplyRequest } from "./LogisticsRequest";
import { LogisticsSource } from "./LogisticsSource";

enum RouteState {
    PENDING = 'PENDING',
    GETTING_ENERGY = 'GETTING_ENERGY',
    FULFILLING = 'FULFILLING',
    CANCELLED = 'CANCELLED',
    COMPLETED = 'COMPLETED'
}

export class LogisticsRoute {
    // Dependencies
    private mapAnalyst: MapAnalyst;
    private statisticsAnalyst: StatisticsAnalyst;

    public length = Infinity;
    public state = RouteState.PENDING;
    source?: LogisticsSource;
    requests: LogisticsRequest[];
    private _creep: Id<Creep>;
    public maxCapacity: number = 0;
    public capacity: number = 0;
    public assignedCapacity = new Map<LogisticsRequest, number>();
    public began: number = -1;
    public office: Office;


    public get creep() {
        return Game.getObjectById(this._creep);
    }

    public get completed() {
        return this.state === RouteState.COMPLETED || this.state === RouteState.CANCELLED;
    }

    constructor(office: Office, creep: Creep, request: LogisticsRequest, sources: LogisticsSource[]) {
        // Set up dependencies
        this.mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst;
        this.statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
        // Resupply requests can only be fulfilled by a primary source
        this.requests = [request];
        this._creep = creep.id;
        this.office = office;
        this.init(creep, request, sources);
    }
    init(creep: Creep, request: LogisticsRequest, sources: LogisticsSource[]) {
        // Get shortest route to source and then request
        if (creep.store.getUsedCapacity() / creep.store.getCapacity() < 0.8) {
            let prioritySources = this.calcPrioritySources(creep, request, sources);
            this.calcInitialPath(creep, request, prioritySources);
        }

        this.calcInitialCapacity(creep, request);
    }

    calcPrioritySources(creep: Creep, request: LogisticsRequest, sources: LogisticsSource[]) {
        let creepCapacity = creep.store.getFreeCapacity(RESOURCE_ENERGY);
        let fullCreepSources: LogisticsSource[] = [];
        let fullRequestSources: LogisticsSource[] = [];
        let validSources: LogisticsSource[] = [];
        for (let source of sources) {
            // Resupply requests can only be fulfilled by a primary source
            if (request instanceof ResupplyRequest && !source.primary) continue;

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
            let distance = this.mapAnalyst.getRangeTo(creep.pos, source.pos) + this.mapAnalyst.getRangeTo(source.pos, request.pos);
            if (distance < this.length) {
                this.source = source;
                this.length = distance;
            }
        })
    }
    calcInitialCapacity(creep: Creep, request: LogisticsRequest) {
        this.maxCapacity = Math.min(creep.store.getCapacity(), creep.store.getUsedCapacity() + (this.source?.capacity ?? 0));
        this.assignedCapacity.set(request, Math.min(this.maxCapacity, request.capacity));
        if (request instanceof DepotRequest) {
            this.capacity = 0;
        } else {
            this.capacity = this.maxCapacity - request.capacity;
        }
    }

    extend(request: LogisticsRequest) {
        if (this.capacity > 0) {
            if (request instanceof ResupplyRequest && !this.source?.primary) {
                // Resupply requests can only be handled by primary sources
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
            this.source.reserve(this.maxCapacity);
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

        // console.log(`${this.requests.length}-request Route began with ${this.assignedCapacity.size} assigned capacities totaling ${[...this.assignedCapacity.values()].reduce((a, b) => a + b, 0)}`)
        this.began = Game.time;

        return true;
    }

    setState(s: RouteState) {
        this.state = s;
        if (s === RouteState.CANCELLED || s === RouteState.COMPLETED) {
            // Calculate throughput
            let t = Game.time - this.began;
            let fulfilled = 0;
            for (let [req, capacity] of this.assignedCapacity) {
                if (req.completed) fulfilled += capacity;
            }
            let throughput = fulfilled / t;
            if (isNaN(throughput)) return;
            if (throughput === Infinity) {
                console.log('Infinite throughput error');
                return;
            }
            let metrics = this.statisticsAnalyst.metrics.get(this.office.name) as PipelineMetrics;
            metrics.logisticsThroughput.update(throughput); // throughput per tick
            console.log(`Route ${s}, fulfilled ${fulfilled} capacity in ${t} ticks (${throughput} e/t)`);
        }
    }

    run() {
        // Validate current state
        if (!this.creep) { // Creep not found
            // Unassign remaining requests
            this.requests.forEach(r => {
                r.assigned = false;
                r.assignedCapacity -= this.assignedCapacity.get(r) ?? 0
            });
            // If creep has not withdrawn, cancel reservation
            if (this.state === RouteState.GETTING_ENERGY) {
                this.source?.unreserve(this.requests.reduce((sum, req) => sum + req.capacity, 0))
            }
            this.setState(RouteState.CANCELLED);
            return;
        }
        // Change state, if appropriate
        switch(this.state) {
            case RouteState.GETTING_ENERGY: {
                if (!(this.creep.store.getFreeCapacity() === 0 || this.source?.capacity === 0)) {
                    break;
                }
                this.setState(RouteState.FULFILLING);
                // This step done - falls through to the next
            }
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
                let result = this.source.transfer(this.creep);
                if (result !== OK) {
                    this.setState(RouteState.CANCELLED);
                }
                break;
            }
            case RouteState.FULFILLING: {
                let result = this.requests[0].action(this.creep);
                if (result !== OK) {
                    this.setState(RouteState.CANCELLED);
                }
                break;
            }
        }
    }
}

profiler.registerClass(LogisticsRoute, 'LogisticsRoute');
