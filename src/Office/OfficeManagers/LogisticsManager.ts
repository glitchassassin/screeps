import { Bar, Dashboard, Grid, Label, LineChart, Metrics, Rectangle, Table } from "screeps-viz";

import { Capacity } from "WorldState/Capacity";
import { ControllerAnalyst } from "Analysts/ControllerAnalyst";
import { FillStructuresRequest } from "BehaviorTree/requests/FillStructuresRequest";
import { FranchiseData } from "WorldState/FranchiseData";
import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { LogisticsRouteData } from "WorldState/LogisticsRoutes";
import { MineData } from "WorldState/MineData";
import { OfficeTaskManager } from "./OfficeTaskManager";
import { PROFILE } from "config";
import { RoomPlanData } from "WorldState/RoomPlans";
import { SalesAnalyst } from "Analysts/SalesAnalyst";
import { Sources } from "WorldState/Sources";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { StorageRequest } from "BehaviorTree/requests/StorageRequest";
import { TransferRequest } from "BehaviorTree/requests/TransferRequest";
import profiler from "screeps-profiler";

export class LogisticsManager extends OfficeTaskManager {
    minionTypes = ['ACCOUNTANT']
    sortRequestsByCreepDistance = false;

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
            pos: { x: 18, y: 5 },
            width: 30,
            height: 10,
            widget: Rectangle({ data: Grid(() => {
                let statisticsAnalyst = this.office.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
                return {
                    data: [
                        Bar(() => ({
                            data: {
                                value: Metrics.last(statisticsAnalyst.metrics.get(this.office.name)!.mineContainerLevels)[1],
                                maxValue: SalesAnalyst.getExploitableFranchises(this.office).length * CONTAINER_CAPACITY,
                            },
                            config: {
                                label: 'Franchises',
                                style: {fill: 'yellow', stroke: 'yellow'}
                            }
                        })),
                        Bar(() => ({
                            data: {
                                value: Metrics.last(statisticsAnalyst.metrics.get(this.office.name)!.roomEnergyLevels)[1],
                                maxValue: Game.rooms[this.office.center.name].energyCapacityAvailable
                            },
                            config: {
                                label: 'HR',
                                style: {fill: 'magenta', stroke: 'magenta'}
                            }
                        })),
                        Bar(() => ({
                            data: {
                                value: Metrics.last(statisticsAnalyst.metrics.get(this.office.name)!.fleetLevels)[1],
                                maxValue: LogisticsAnalyst.getAccountants(this.office).reduce((sum, creep) => (sum + (Capacity.byId(creep.id)?.capacity ?? 0)), 0),
                            },
                            config: {
                                label: 'Fleet',
                                style: {fill: 'purple', stroke: 'purple'}
                            }
                        })),
                        Bar(() => ({
                            data: {
                                value: Metrics.last(statisticsAnalyst.metrics.get(this.office.name)!.storageLevels)[1],
                                maxValue: Capacity.byId(LogisticsAnalyst.getStorage(this.office)?.id)?.capacity ?? 0,
                            },
                            config: {
                                label: 'Storage',
                                style: {fill: 'green', stroke: 'green'}
                            }
                        })),
                        Bar(() => ({
                            data: {
                                value: Metrics.last(statisticsAnalyst.metrics.get(this.office.name)!.controllerDepotLevels)[1],
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
                };
            }) })
        },
        {
            pos: { x: 1, y: 5 },
            width: 5,
            height: 10,
            widget: Rectangle({ data: this.idleMinionsTable })
        },
        {
            pos: { x: 1, y: 16 },
            width: 30,
            height: 15,
            widget: Rectangle({ data: this.requestsTable })
        },
        {
            pos: { x: 1, y: 32 },
            width: 15,
            height: 10,
            widget: Rectangle({ data: Table(() => {
                return {
                    data: (this.requests.filter(r => r instanceof FillStructuresRequest) as FillStructuresRequest[]).map(r => {
                        return [
                            `${r.route}`,
                            r.destinationsCapacity()
                        ]
                    }),
                    config: {
                        headers: ['Route', 'Destination Capacity']
                    }
                }
            }) })
        }
    ];

    // TODO - Implement Metrics
    miniReport = Rectangle({ data: LineChart(() => {
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
        let stats = statisticsAnalyst.metrics.get(this.office.name);
        return {
            data: {
                income: Metrics.granularity(stats!.mineRate, 20),
                throughput: Metrics.granularity(stats!.logisticsPrimaryThroughput, 20),
                spawn: Metrics.granularity(stats!.spawnEnergyRate, 20),
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
                columns: 4,
                rows: 1
            }
        }
    }) })

    plan() {
        super.plan();

        let plans = LogisticsRouteData.byRoom(this.office.name);
        if (!plans?.office) return;

        // Submit hauling orders
        // Consumption orders should generally be higher-priority than supply orders
        let office = RoomPlanData.byRoom(this.office.name)?.office;
        if (office) {
            if (!this.requests.some(r => r instanceof FillStructuresRequest && r.route === 'extensionsAndSpawns')) {
                this.submit(new FillStructuresRequest(office.headquarters.storage, this.office.name, 'extensionsAndSpawns', 8))
            }
            if (!this.requests.some(r => r instanceof FillStructuresRequest && r.route === 'towers')) {
                this.submit(new FillStructuresRequest(office.headquarters.storage, this.office.name, 'towers', 8))
            }
            for (let franchise of FranchiseData.byOffice(this.office)) {
                if (!this.requests.some(r => r instanceof StorageRequest && r.pos.isEqualTo(franchise.pos))) {
                    this.submit(new StorageRequest(franchise.pos, office.headquarters.storage, 5));
                }
            }
            for (let mine of MineData.byOffice(this.office)) {
                if (!this.requests.some(r => r instanceof StorageRequest && r.pos.isEqualTo(mine.pos))) {
                    this.submit(new StorageRequest(mine.pos, office.headquarters.storage, 5));
                }
            }
            let link = office.headquarters.link;
            if (link.structure && !this.requests.some(r => r instanceof StorageRequest && r.pos.isEqualTo(link.pos))) {
                this.submit(new StorageRequest(link.pos, office.headquarters.storage, 5, RESOURCE_ENERGY, false));
            }

            if (!this.requests.some(r => r instanceof TransferRequest && r.pos.isEqualTo(office!.headquarters.container.pos))) {
                let freeSpace = Capacity.byId(office!.headquarters.container.structure?.id as Id<StructureContainer>, RESOURCE_ENERGY)?.free;
                if (freeSpace === undefined) {
                    freeSpace = CONTAINER_CAPACITY - LogisticsAnalyst.countEnergyInContainersOrGround(office!.headquarters.container.pos, false)
                }
                if (freeSpace > (CONTAINER_CAPACITY / 2)) {
                    this.submit(new TransferRequest(office.headquarters.storage, office.headquarters.container, true, 7, RESOURCE_ENERGY))
                }
            }
        }
    }
    run() {
        super.run();

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
}

if (PROFILE.managers) profiler.registerClass(LogisticsManager, 'LogisticsManager')
