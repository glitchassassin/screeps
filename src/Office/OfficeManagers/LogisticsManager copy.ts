import { Bar, Dashboard, Grid, Label, LineChart, Metrics, Rectangle, Table } from "screeps-viz";
import { LogisticsSource, SourceType } from "Logistics/LogisticsSource";

import { Capacity } from "WorldState/Capacity";
import { ControllerAnalyst } from "Analysts/ControllerAnalyst";
import { FacilitiesAnalyst } from "Analysts/FacilitiesAnalyst";
import { HRAnalyst } from "Analysts/HRAnalyst";
import { LegalData } from "WorldState/LegalData";
import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { LogisticsRequest } from "Logistics/LogisticsRequest";
import { LogisticsRoute } from "Logistics/LogisticsRoute";
import { MapAnalyst } from "Analysts/MapAnalyst";
import { Office } from "Office/Office";
import { OfficeManager } from "Office/OfficeManager";
import { SalesAnalyst } from "Analysts/SalesAnalyst";
import { Sources } from "WorldState/Sources";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { lazyFilter } from "utils/lazyIterators";
import { log } from "utils/logger";

export class LogisticsManager extends OfficeManager {
    constructor(
        office: Office,
        private statisticsAnalyst = office.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst
    ) {
        super(office);
    }

    dashboard = [
        {
            pos: { x: 1, y: 1 },
            width: 47,
            height: 3,
            widget: Rectangle({ data: Label({
                data: 'Logistics Manager Report',
                config: { style: { font: 1.4 } }
            }) })
        },
        {
            pos: { x: 1, y: 5 },
            width: 16,
            height: 10,
            widget: Rectangle({ data: Table(() => {
                return {
                    data: [...this.sources.values()].map(source => [
                        `${source.pos.roomName}[${source.pos.x}, ${source.pos.y}]`,
                        source.sourceType,
                        source.capacity,
                        source.reservedCapacity
                    ]),
                    config: {
                        headers: ['Source', 'Source Type', 'Capacity', 'Reserved']
                    }
                }
            }) })
        },
        {
            pos: { x: 18, y: 5 },
            width: 30,
            height: 10,
            widget: Rectangle({ data: Grid({
                data: [
                    Bar(() => ({
                        data: {
                            value: Metrics.last(this.statisticsAnalyst.metrics.get(this.office.name)!.mineContainerLevels)[1],
                            maxValue: SalesAnalyst.getExploitableFranchises(this.office).length * CONTAINER_CAPACITY,
                        },
                        config: {
                            label: 'Franchises',
                            style: {fill: 'yellow', stroke: 'yellow'}
                        }
                    })),
                    Bar(() => ({
                        data: {
                            value: Metrics.last(this.statisticsAnalyst.metrics.get(this.office.name)!.roomEnergyLevels)[1],
                            maxValue: Game.rooms[this.office.center.name].energyCapacityAvailable
                        },
                        config: {
                            label: 'HR',
                            style: {fill: 'magenta', stroke: 'magenta'}
                        }
                    })),
                    Bar(() => ({
                        data: {
                            value: Metrics.last(this.statisticsAnalyst.metrics.get(this.office.name)!.fleetLevels)[1],
                            maxValue: LogisticsAnalyst.getCarriers(this.office).reduce((sum, creep) => (sum + (Capacity.byId(creep.id)?.capacity ?? 0)), 0),
                        },
                        config: {
                            label: 'Fleet',
                            style: {fill: 'purple', stroke: 'purple'}
                        }
                    })),
                    Bar(() => ({
                        data: {
                            value: Metrics.last(this.statisticsAnalyst.metrics.get(this.office.name)!.storageLevels)[1],
                            maxValue: Capacity.byId(LogisticsAnalyst.getStorage(this.office)?.id)?.capacity ?? 0,
                        },
                        config: {
                            label: 'Storage',
                            style: {fill: 'green', stroke: 'green'}
                        }
                    })),
                    Bar(() => ({
                        data: {
                            value: Metrics.last(this.statisticsAnalyst.metrics.get(this.office.name)!.controllerDepotLevels)[1],
                            maxValue: Capacity.byId(ControllerAnalyst.getDesignatedUpgradingLocations(this.office)?.containerId)?.capacity || 0,
                        },
                        config: {
                            label: 'Legal',
                            style: {fill: 'blue', stroke: 'blue'}
                        }
                    })),
                ],
                config: {
                    columns: 6,
                    rows: 1
                }
            }) })
        },
        {
            pos: { x: 1, y: 16 },
            width: 36,
            height: 20,
            widget: Rectangle({ data: Table(() => {
                return {
                    data: [...this.requests.values()].map(req => [
                        `${req.pos.roomName}[${req.pos.x}, ${req.pos.y}]`,
                        `${req.constructor.name} (${req.sourceType})`,
                        req.priority,
                        req.capacity,
                        req.assignedCapacity,
                        req.completed ? 'Y' : ''
                    ]),
                    config: {
                        headers: ['Requester', 'Type', 'Priority', 'Capacity', 'Assigned', 'Completed']
                    }
                }
            }) })
        },
        {
            pos: { x: 38, y: 16 },
            width: 10,
            height: 10,
            widget: Rectangle({ data: Table(() => ({
                data: this.getIdleCarriers().map(creep => [creep.name]),
                config: {
                    headers: ['Minion']
                }
            })) })
        },
        {
            pos: { x: 1, y: 37 },
            width: 47,
            height: 10,
            widget: Rectangle({ data: Table(() => ({
                data: [...this.routes.values()].map(route => {
                    let source = 'SURPLUS';
                    if (route.source) source = `${route.source.pos.roomName}[${route.source.pos.x}, ${route.source.pos.y}]` + `(${route.source?.sourceType ?? ''})`
                    return [
                        source,
                        route.requests.map(r => `${r.pos.roomName}[${r.pos.x}, ${r.pos.y}]`).join('->').slice(0, 42),
                        route.creep?.name,
                        `${Math.min(route.maxCapacity, route.maxCapacity - route.capacity)}/${route.maxCapacity}`,
                    ]
                }),
                config: {
                    headers: ['Source', 'Requests', 'Minion', 'Utilized Capacity']
                }
            })) })
        },
    ]

    // TODO - Implement Metrics
    miniReport = Rectangle({ data: LineChart(() => {
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
        let stats = statisticsAnalyst.metrics.get(this.office.name);
        return {
            data: {
                income: Metrics.granularity(stats!.mineRate, 20),
                throughput: Metrics.granularity(stats!.logisticsPrimaryThroughput, 20),
                spawn: Metrics.granularity(stats!.spawnEnergyRate, 20),
                waste: Metrics.granularity(stats!.deathLossesRate, 20),
                storage: Metrics.granularity(stats!.storageFillRate, 20)
            },
            config: {
                series: {
                    income: {
                        label: 'Income',
                        color: 'yellow'
                    },
                    throughput: {
                        label: 'Throughput',
                        color: 'magenta'
                    },
                    spawn: {
                        label: 'Spawn',
                        color: 'blueviolet'
                    },
                    waste: {
                        label: 'Waste',
                        color: 'red'
                    },
                    storage: {
                        label: 'Storage',
                        color: 'green'
                    },
                }
            }
        }
    }) })

    miniReportBars = Rectangle({ data: Grid(() => {
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
        let stats = statisticsAnalyst.metrics.get(this.office.name);

        let mineRate = Metrics.avg(stats!.mineRate);
        let spawn = Metrics.avg(stats!.spawnEnergyRate);
        let waste = Metrics.avg(stats!.deathLossesRate);
        let throughput = Metrics.avg(stats!.logisticsPrimaryThroughput);
        let upgrade = Metrics.avg(stats!.controllerUpgradeRate);

        // Theoretical maximum income if utilizing all franchises
        let max = SalesAnalyst.getExploitableFranchises(this.office)
            .map(f => Sources.byId(f.id)?.energyCapacity ?? 1500)
            .reduce((a, b) => a + b, 0) / 300

        return {
            data: [
                Bar({
                    data: {
                        value: mineRate,
                        maxValue: max,
                    },
                    config: {
                        label: 'Income',
                        style: {
                            stroke: 'yellow',
                            fill: 'yellow'
                        }
                    }
                }),
                Bar({
                    data: {
                        value: throughput,
                        maxValue: max,
                    },
                    config: {
                        label: 'Storage',
                        style: {
                            stroke: 'green',
                            fill: 'green'
                        }
                    }
                }),
                Bar({
                    data: {
                        value: spawn,
                        maxValue: max,
                    },
                    config: {
                        label: 'Spawn',
                        style: {
                            stroke: 'blueviolet',
                            fill: 'blueviolet'
                        }
                    }
                }),
                Bar({
                    data: {
                        value: waste,
                        maxValue: max,
                    },
                    config: {
                        label: 'Waste',
                        style: {
                            stroke: 'red',
                            fill: 'red'
                        }
                    }
                }),
                Bar({
                    data: {
                        value: upgrade,
                        maxValue: max,
                    },
                    config: {
                        label: 'Upgrading',
                        style: {
                            stroke: 'cyan',
                            fill: 'cyan'
                        }
                    }
                }),
            ],
            config: {
                columns: 5,
                rows: 1
            }
        }
    }) })

    lastMinionRequest = 0;

    sources = new Map<string, LogisticsSource>();
    requests = new Map<string, LogisticsRequest>();
    routes = new Map<string, LogisticsRoute>();

    submit(requestId: string, request: LogisticsRequest) {
        if (request.completed) return;
        let req = this.requests.get(requestId);
        if (!req || req.priority < request.priority) {
            if (req) req.completed = true;
            this.requests.set(requestId, request);
        }
    }

    getIdleCarriers() {
        return Array.from(lazyFilter(
            LogisticsAnalyst.getCarriers(this.office),
            c => !this.routes.has(c.name)
        )).sort(MapAnalyst.sortByDistanceTo(this.office.controller.pos));
    }
    /**
     * Returns ticks until the fleet is completely despawned
     */
    fleetTTL() {
        let max = 0;
        for (let c of LogisticsAnalyst.getCarriers(this.office)) {
            max = Math.max((c.ticksToLive ?? 0), max)
        }
        return max;
    }

    plan() {
        let idleCarriers = this.getIdleCarriers();
        let storage = LogisticsAnalyst.getStorage(this.office);
        let storagePos = storage?.pos ?? FacilitiesAnalyst.getPlannedStructures(this.office).find(s => s.structureType === STRUCTURE_STORAGE)?.pos
        let legalData = LegalData.byRoom(this.office.name);
        let spawns = HRAnalyst.getSpawns(this.office);

        // Update LogisticsSources
        this.sources = new Map<string, LogisticsSource>();
        SalesAnalyst.getExploitableFranchises(this.office).forEach(f => {
            if (!this.sources.has(f.pos.toString())) {
                this.sources.set(f.pos.toString(), new LogisticsSource(f.pos))
            }
        });
        if (storagePos && !this.sources.has(storagePos.toString())) {
            this.sources.set(storagePos.toString(), new LogisticsSource(storagePos, SourceType.STORAGE, false))
        }
        spawns.forEach(spawn => {
            if (!this.sources.has(spawn.pos.toString())) {
                this.sources.set(spawn.pos.toString(), new LogisticsSource(spawn.pos))
            }
        })
        if (legalData?.linkPos && legalData?.linkId && !this.sources.has(legalData.linkPos.toString())) {
            this.sources.set(legalData.linkPos.toString(), new LogisticsSource(legalData.linkPos, SourceType.PRIMARY, false))
        }
        // TODO: Clean up sources if storage gets destroyed/franchise is abandoned

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

        log('LogisticsManager', `Request priorities: ${[...priorities.keys()]}`);

        while (priorities.size > 0) {
            let carrier = idleCarriers.shift();
            if (!carrier) break;

            // Get requests for highest priority level
            let priority = Math.max(...priorities.keys());
            let level = priorities.get(priority) ?? [];

            log('LogisticsManager', `Priority ${priority}: ${level.length} requests, ${idleCarriers.length + 1} Carriers`);

            if (level.length === 0) {
                priorities.delete(priority);
                idleCarriers.unshift(carrier);
                continue;
            }

            // Set up route for initial request
            let lastRequest = level.shift() as LogisticsRequest;
            let route = new LogisticsRoute(this.office, carrier, lastRequest, [...this.sources.values()]);

            if (route.maxCapacity === 0) {
                // No available sources for request; continue
                // log('LogisticsManager', `No available sources for request: ${lastRequest}`)
                idleCarriers.unshift(carrier);
                continue;
            }

            // Fulfill other close requests, by priority order
            while (priorities.size > 0) {
                // Among the same priority, fulfill the closest requests first
                level.sort(MapAnalyst.sortByDistanceTo(lastRequest.pos));
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
                if (request.completed || (request.assignedCapacity >= request.capacity)) {
                    continue;
                }
                if (!route.extend(request)) break; // No more requests for route
                lastRequest = request;
            }

            if (route.commit()) {
                this.routes.set(carrier.name, route);
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
            Dashboard({
                widgets: this.dashboard,
                config: {
                    room: this.office.name
                }
            });
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
}

// profiler.registerClass(LogisticsManager, 'LogisticsManager');
