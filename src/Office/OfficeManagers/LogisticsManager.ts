import { HRAnalyst } from "Boardroom/BoardroomManagers/HRAnalyst";
import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { LogisticsRequest, ResupplyRequest } from "Logistics/LogisticsRequest";
import { LogisticsRoute } from "Logistics/LogisticsRoute";
import { LogisticsSource } from "Logistics/LogisticsSource";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";
import profiler from "screeps-profiler";
import { getFreeCapacity, sortByDistanceTo } from "utils/gameObjectSelectors";
import { Bar, Meters } from "Visualizations/Meters";
import { Table } from "Visualizations/Table";
import { HRManager } from "./HRManager";

export class LogisticsManager extends OfficeManager {
    storage?: StructureStorage;
    extensions: StructureExtension[] = [];
    spawns: StructureSpawn[] = [];
    carriers: Creep[] = [];
    lastMinionRequest = 0;

    sources = new Map<string, LogisticsSource>();
    requests = new Map<string, LogisticsRequest>();
    routes = new Map<Id<Creep>, LogisticsRoute>();

    submit(requestId: string, request: LogisticsRequest) {
        let req = this.requests.get(requestId);
        if (!req || req.priority < request.priority) {
            if (req) req.completed = true;
            this.requests.set(requestId, request);
        }
    }

    plan() {
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
        let hrManager = this.office.managers.get('HRManager') as HRManager;

        this.storage = logisticsAnalyst.getStorage(this.office)[0];
        this.extensions = hrAnalyst.getExtensions(this.office)
        this.carriers = logisticsAnalyst.getCarriers(this.office)
        let idleCarriers = this.carriers.filter(c => !this.routes.has(c.id));
        this.spawns = hrAnalyst.getSpawns(this.office)

        // Update LogisticsSources
        salesAnalyst.getFranchiseLocations(this.office).forEach(f => {
            if (!this.sources.has(f.sourcePos.toString())) {
                this.sources.set(f.sourcePos.toString(), new LogisticsSource(f.sourcePos))
            }
        });
        if (this.storage && !this.sources.has(this.storage.pos.toString())) {
            this.sources.set(this.storage.pos.toString(), new LogisticsSource(this.storage.pos, false))
        }
        this.spawns.forEach(spawn => {
            if (!this.sources.has(spawn.pos.toString())) {
                this.sources.set(spawn.pos.toString(), new LogisticsSource(spawn.pos))
            }
        })
        // TODO: Clean up sources if storage gets destroyed/franchise is abandoned

        switch (this.status) {
            case OfficeManagerStatus.OFFLINE: {
                // Manager is offline, do nothing
                return;
            }
            default: {
                // Maintain enough carriers to keep
                // franchises drained
                let metrics = statisticsAnalyst.metrics.get(this.office.name);
                let inputAverageMean = metrics?.mineContainerLevels.asPercentMean() || 0;
                let unassignedRequests = Array.from(this.requests.values()).filter(r => r.assignedCapacity >= r.capacity).length;
                let requestCapacity = unassignedRequests / this.requests.size;
                if (Game.time - this.lastMinionRequest > 50 &&
                    (inputAverageMean > 0.1 && idleCarriers.length === 0 && requestCapacity >= 0.5)) {
                    console.log(`Franchise surplus of ${(inputAverageMean * 100).toFixed(2)}% and ${unassignedRequests}/${this.requests.size} requests unfilled, spawning carrier`);
                    hrManager.submit(new MinionRequest(`${this.office.name}_Logistics`, 6, MinionTypes.CARRIER, {manager: this.constructor.name}));
                    this.lastMinionRequest = Game.time;
                } else if (Game.time - this.lastMinionRequest > 50 &&
                    (inputAverageMean > 0.5 && idleCarriers.length === 0)) {
                    console.log(`Franchise surplus of ${(inputAverageMean * 100).toFixed(2)}%, spawning carrier`);
                    hrManager.submit(new MinionRequest(`${this.office.name}_Logistics`, 4, MinionTypes.CARRIER, {manager: this.constructor.name}));
                    this.lastMinionRequest = Game.time;
                }
                break;
            }
        }

        // Make sure we have a standing request for storage
        if (this.storage && getFreeCapacity(this.storage) > 0) {
            this.submit(this.storage.id, new ResupplyRequest(this.storage, 1))
        }
        // Create a request to recycle old creeps

        // Try to route requests
        // Prioritize requests
        let priorities = new Map<number, LogisticsRequest[]>();
        for (let [,req] of this.requests) {
            if (req.completed || (req.assigned && req.assignedCapacity >= req.capacity)) continue;
            let level = priorities.get(req.priority);
            if (!level) {
                level = [];
                priorities.set(req.priority, level)
            }
            level.push(req);
        }

        while (priorities.size > 0) {
            let carrier = idleCarriers.shift();
            if (!carrier) break;

            // Get requests for highest priority level
            let priority = Math.max(...priorities.keys());
            let level = priorities.get(priority) ?? [];
            if (level.length === 0) {
                priorities.delete(priority);
                continue;
            }

            // Set up route for initial request
            let lastRequest = level.shift() as LogisticsRequest;
            let route = new LogisticsRoute(this.office, carrier, lastRequest, [...this.sources.values()]);

            // Fulfill other close requests, by priority order
            while (priorities.size > 0) {
                // Among the same priority, fulfill the closest requests first
                level.sort(sortByDistanceTo(lastRequest.pos));
                // Get next request
                let request = level?.shift();
                // If no more requests for this priority, skip to next
                if (!request) {
                    // End of level
                    priorities.delete(priority);
                    priority = Math.max(...priorities.keys());
                    level = priorities.get(priority) ?? [];
                    if (level.length === 0) {
                        priorities.delete(priority);
                    }
                    continue;
                }
                if (!route.extend(request)) break; // No more requests for route
                lastRequest = request;
            }

            if (route.commit()) {
                this.routes.set(carrier.id, route);
            } else {
                throw new Error('Failed to commit route');
            }
        }
    }
    run() {
        // Execute routes
        this.routes.forEach((route, creepId) => {
            route.run();
            if (route.completed) {
                this.routes.delete(creepId);
            }
        })

        // Display visuals
        if (global.v.logistics.state) {
            this.report();
            this.map();
        }
    }
    cleanup() {
        let assignedRequests: LogisticsRequest[] = [];
        for (let [,route] of this.routes) {
            assignedRequests.push(...route.requests)
        }
        for (let [id,req] of this.requests) {
            if (req.completed) {
                this.requests.delete(id);
                continue;
            }
            if (!assignedRequests.includes(req)) {
                req.assigned = false;
            }
        }
    }
    report() {
        // Franchise energy level (current and average)
        // Storage level (current)
        // Room energy level (current and average)
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
        let metrics = statisticsAnalyst.metrics.get(this.office.name);

        let lastMineContainerLevel = metrics?.mineContainerLevels.values[metrics?.mineContainerLevels.values.length - 1] || 0
        let lastRoomEnergyLevel = metrics?.roomEnergyLevels.values[metrics?.roomEnergyLevels.values.length - 1] || 0
        let lastFleetLevel = metrics?.fleetLevels.values[metrics?.fleetLevels.values.length - 1] || 0
        let lastMobileDepotLevel = metrics?.mobileDepotLevels.values[metrics?.mobileDepotLevels.values.length - 1] || 0
        let lastStorageLevel = metrics?.storageLevels.values[metrics?.storageLevels.values.length - 1] || 0
        let lastControllerDepotLevel = metrics?.controllerDepotLevels.values[metrics?.controllerDepotLevels.values.length - 1] || 0

        let chart = new Meters([
            new Bar('Franchises', {fill: 'yellow', stroke: 'yellow'}, lastMineContainerLevel, metrics?.mineContainerLevels.maxValue),
            new Bar('HR', {fill: 'magenta', stroke: 'magenta'}, lastRoomEnergyLevel, metrics?.roomEnergyLevels.maxValue),
            new Bar('Fleet', {fill: 'purple', stroke: 'purple'}, lastFleetLevel, metrics?.fleetLevels.maxValue),
            new Bar('Depots', {fill: 'brown', stroke: 'brown'}, lastMobileDepotLevel, metrics?.mobileDepotLevels.maxValue),
            new Bar('Storage', {fill: 'green', stroke: 'green'}, lastStorageLevel, metrics?.storageLevels.maxValue),
            new Bar('Legal', {fill: 'blue', stroke: 'blue'}, lastControllerDepotLevel, metrics?.controllerDepotLevels.maxValue),
        ])

        chart.render(new RoomPosition(2, 2, this.office.center.name));

        // Requests
        const taskTable: any[][] = [['Requester', 'Type', 'Priority', 'Capacity', 'Assigned']];
        for (let [, req] of this.requests) {
            taskTable.push([
                JSON.stringify(req.pos),
                req.constructor.name,
                req.priority,
                req.capacity,
                req.assignedCapacity
            ])
        }
        Table(new RoomPosition(0, 35, this.office.center.name), taskTable);

        // Sources
        const sourceTable: any[][] = [['Source', 'Primary', 'Capacity', 'Reserved']];
        for (let [, source] of this.sources) {
            sourceTable.push([
                JSON.stringify(source.pos),
                source.primary,
                source.capacity,
                source.reservedCapacity
            ])
        }
        Table(new RoomPosition(0, 15, this.office.center.name), sourceTable);

        // Routes
        const routeTable: any[][] = [['Source', 'Requests', 'Minion', 'Utilized Capacity']];
        for (let [, route] of this.routes) {
            let source = 'SURPLUS';
            if (route.source) source = route.source?.pos.toString() + `(${route.source?.primary ? 'Primary': 'Secondary'})`
            routeTable.push([
                source,
                route.requests.map(r => r.toString()).join('->'),
                route.creep?.name,
                `${Math.min(route.maxCapacity, route.maxCapacity - route.capacity)}/${route.maxCapacity}`,
            ])
        }
        Table(new RoomPosition(0, 23, this.office.center.name), routeTable);
    }
    map() {
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let depots = logisticsAnalyst.depots.get(this.office.name)

        depots?.forEach(c => new RoomVisual(c.pos.roomName).circle(c.pos, {radius: 1.5, stroke: '#f0f', fill: 'transparent'}))
    }
    miniReport = (pos: RoomPosition) => {
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
        let metrics = statisticsAnalyst.metrics.get(this.office.name);
        if (!metrics) return;

        let chart = new Meters([
            new Bar('Income', {fill: 'yellow', stroke: 'yellow'}, metrics.mineRate.mean()),
            new Bar('Throughput', {fill: 'magenta', stroke: 'magenta'}, metrics.logisticsThroughput.mean()),
            new Bar('Build', {fill: 'blue', stroke: 'blue'}, metrics.buildRate.mean()),
            new Bar('Repair', {fill: 'blue', stroke: 'blue'}, metrics.repairRate.mean()),
            new Bar('Upgrade', {fill: 'blue', stroke: 'blue'}, metrics.upgradeRate.mean()),
            new Bar('Spawn', {fill: 'blue', stroke: 'blue'}, metrics.spawnEnergyRate.mean()),
            new Bar('Waste', {fill: 'red', stroke: 'red'}, metrics.deathLossesRate.mean()),
            new Bar('Total', {fill: 'blue', stroke: 'blue'}, metrics.buildRate.mean() + metrics.repairRate.mean() + metrics.upgradeRate.mean() + metrics.spawnEnergyRate.mean() + metrics.deathLossesRate.mean()),
            new Bar('Storage', {fill: 'green', stroke: 'green'}, metrics.storageFillRate.mean())
        ])

        chart.render(pos, false);
    }
}

profiler.registerClass(LogisticsManager, 'LogisticsManager');
profiler.registerFN(LogisticsManager.constructor, 'new LogisticsManager()')
