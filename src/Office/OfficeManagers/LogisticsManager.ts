import { Bar, Dashboard, Grid, Label, LineChart, Metrics, Rectangle, Table } from "screeps-viz";

import { Capacity } from "WorldState/Capacity";
import { ControllerAnalyst } from "Analysts/ControllerAnalyst";
import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { LogisticsRouteData } from "WorldState/LogisticsRoutes";
import { LogisticsRouteRequest } from "BehaviorTree/requests/LogisticsRoute";
import { OfficeTaskManager } from "./OfficeTaskManager";
import { SalesAnalyst } from "Analysts/SalesAnalyst";
import { Sources } from "WorldState/Sources";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";

export class LogisticsManager extends OfficeTaskManager {
    minionTypes = ['CARRIER']
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
                                maxValue: LogisticsAnalyst.getCarriers(this.office).reduce((sum, creep) => (sum + (Capacity.byId(creep.id)?.capacity ?? 0)), 0),
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
            pos: { x: 38, y: 16 },
            width: 10,
            height: 10,
            widget: Rectangle({ data: Table(() => ({
                data: this.getAvailableCreeps().map(creep => [creep.name]),
                config: {
                    headers: ['Minion']
                }
            })) })
        },
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

    plan() {
        super.plan();

        let plans = LogisticsRouteData.byRoom(this.office.name);
        if (!plans?.office) return;

        if (!this.requests.some(r => r instanceof LogisticsRouteRequest && r.name === 'extensionsAndSpawns')) {
            this.submit(new LogisticsRouteRequest('extensionsAndSpawns', plans.office.extensionsAndSpawns))
        }
        if (!this.requests.some(r => r instanceof LogisticsRouteRequest && r.name === 'sources')) {
            this.submit(new LogisticsRouteRequest('sources', plans.office.sources))
        }
        if (!this.requests.some(r => r instanceof LogisticsRouteRequest && r.name === 'towers')) {
            this.submit(new LogisticsRouteRequest('towers', plans.office.towers))
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
