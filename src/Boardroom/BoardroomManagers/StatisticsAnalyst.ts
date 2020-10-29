import { Boardroom } from "Boardroom/Boardroom";
import { BoardroomManager } from "Boardroom/BoardroomManager";
import { ControllerAnalyst } from "./ControllerAnalyst";
import { HRAnalyst } from "./HRAnalyst";
import { LogisticsAnalyst } from "./LogisticsAnalyst";
import { SalesAnalyst } from "./SalesAnalyst";

export class Metric {
    values: number[] = [];

    constructor(
        public maxValue: number,
        public length: number
    ) {}

    update(value: number) {
        this.values.push(value);
        if (this.values.length > this.length) {
            this.values.shift();
        }
    }

    // Get statistics
    mean() {
        return this.values.reduce((a, b) => (a + b), 0) / this.values.length;
    }
    max() {
        return this.values.reduce((a, b) => Math.max(a, b), -Infinity);
    }
    min() {
        return this.values.reduce((a, b) => Math.min(a, b), Infinity);
    }
    asPercentMean() {
        return (this.mean() / this.maxValue);
    }
    asPercentMax() {
        return (this.max() / this.maxValue);
    }
    asPercentMin() {
        return (this.min() / this.maxValue);
    }
}

export class DeltaMetric extends Metric {
    lastValue: number = NaN;
    update(value: number) {
        if (isNaN(this.lastValue)) {
            this.lastValue = value;
        }
        this.values.push(this.lastValue - value);
        if (this.values.length > this.length) {
            this.values.shift();
        }
        this.lastValue = value;
    }
}

export class NonNegativeDeltaMetric extends DeltaMetric {
    update(value: number) {
        if (isNaN(this.lastValue)) {
            this.lastValue = value;
        }
        this.values.push(Math.max(0, this.lastValue - value));
        if (this.values.length > this.length) {
            this.values.shift();
        }
        this.lastValue = value;
    }
}

export class PipelineMetrics {
    constructor(
        public mineRate: NonNegativeDeltaMetric,
        public mineContainerLevels: Metric,
        public roomEnergyLevels: Metric,
        public spawnEnergyRate: NonNegativeDeltaMetric,
        public storageLevels: Metric,
        public storageFillRate: DeltaMetric,
        public fleetLevels: Metric,
        public mobileDepotLevels: Metric,
        public controllerDepotLevels: Metric,
        public controllerDepotFillRate: DeltaMetric,
        public logisticsThroughput: Metric,
        public buildRate: Metric,
        public repairRate: Metric,
        public upgradeRate: Metric,
        public deathLossesRate: Metric,
        public spawnUtilization: Metric,
    ) { }
}

export class StatisticsAnalyst extends BoardroomManager {
    constructor(
        boardroom: Boardroom,
        private salesAnalyst = boardroom.managers.get('SalesAnalyst') as SalesAnalyst,
        private hrAnalyst = boardroom.managers.get('HRAnalyst') as HRAnalyst,
        private logisticsAnalyst = boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst,
        private controllerAnalyst = boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst
    ) {
        super(boardroom);
    }
    metrics: Map<string, PipelineMetrics> = new Map();

    reset() {
        this.metrics = new Map();
        Memory.boardroom.StatisticsAnalyst = "";
    }

    plan() {
        this.boardroom.offices.forEach(office => {
            if (!this.metrics.has(office.name)) {
                this.metrics.set(office.name,  new PipelineMetrics(
                    new NonNegativeDeltaMetric( // mineRate
                        this.salesAnalyst.getUsableSourceLocations(office)
                            .reduce((sum, source) => (sum + (source.energyCapacity ?? 0)), 0),
                        500
                    ),
                    new Metric( // mineContainerLevels
                        this.salesAnalyst.getUsableSourceLocations(office).length * CONTAINER_CAPACITY,
                        100
                    ),
                    new Metric( // roomEnergyLevels
                        office.center.room.energyCapacityAvailable,
                        100
                    ),
                    new NonNegativeDeltaMetric( // spawnEnergyRate
                        100,
                        500
                    ),
                    new Metric( // storageLevels
                        this.logisticsAnalyst.getStorage(office)?.capacity ?? 0,
                        100
                    ),
                    new DeltaMetric( // storageFillRate
                        100,
                        500
                    ),
                    new Metric( // fleetLevels
                        this.logisticsAnalyst.getCarriers(office).reduce((sum, creep) => (sum + creep.capacity), 0),
                        100
                    ),
                    new Metric( // mobileDepotLevels
                        this.logisticsAnalyst.depots.get(office.name)?.reduce((sum, creep) => (sum + creep.capacity), 0) ?? 0,
                        100
                    ),
                    new Metric( // controllerDepotLevels
                        this.controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.capacity || 0,
                        100
                    ),
                    new DeltaMetric( // controllerDepotFillRate
                        this.controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.capacity || 0,
                        100
                    ),
                    new NonNegativeDeltaMetric( // logisticsThroughput
                        100,
                        500
                    ),
                    new Metric( // buildRate
                        100,
                        500
                    ),
                    new Metric( // repairRate
                        100,
                        500
                    ),
                    new Metric( // upgradeRate
                        100,
                        500
                    ),
                    new Metric( // deathLossesRate
                        100,
                        500
                    ),
                    new Metric( // spawnUtilization
                        1,
                        500
                    ),
                ));
            } else {
                let metrics = this.metrics.get(office.name) as PipelineMetrics;
                metrics.mineRate.maxValue = this.salesAnalyst.getUsableSourceLocations(office)
                    .reduce((sum, source) => (sum + (source.energyCapacity ?? 0)), 0)
                metrics.mineRate.update(
                    this.salesAnalyst.getUsableSourceLocations(office)
                        .reduce((sum, source) => (sum + (source.energy ?? 0)), 0)
                );

                metrics.mineContainerLevels.maxValue = this.salesAnalyst.getUsableSourceLocations(office).length * CONTAINER_CAPACITY;
                metrics.mineContainerLevels.update(
                    this.salesAnalyst.getUsableSourceLocations(office)
                        .reduce((sum, source) => (sum + (source.surplus ?? 0)), 0)
                );

                metrics.roomEnergyLevels.maxValue = office.center.room.energyCapacityAvailable;
                metrics.roomEnergyLevels.update(office.center.room.energyAvailable);
                metrics.spawnEnergyRate.update(office.center.room.energyAvailable);

                metrics.storageLevels.maxValue = this.logisticsAnalyst.getStorage(office)?.capacity ?? 0;
                metrics.storageLevels.update(
                    this.logisticsAnalyst.getStorage(office)?.capacityUsed ?? 0
                );
                metrics.storageFillRate.update(
                    this.logisticsAnalyst.getStorage(office)?.capacityUsed ?? 0
                );

                metrics.fleetLevels.maxValue = this.logisticsAnalyst.getCarriers(office).reduce((sum, creep) => (sum + creep.capacity), 0);
                let fleetLevel = this.logisticsAnalyst.getCarriers(office)
                    .reduce((sum, creep) => (sum + creep.capacityUsed), 0)
                metrics.fleetLevels.update(fleetLevel);
                metrics.logisticsThroughput.update(fleetLevel);

                metrics.mobileDepotLevels.maxValue = this.logisticsAnalyst.depots.get(office.name)?.reduce((sum, creep) => (sum + creep.capacity), 0) ?? 0;
                metrics.mobileDepotLevels.update(
                    this.logisticsAnalyst.depots.get(office.name)?.reduce((sum, creep) => (sum + creep.capacityUsed), 0) ?? 0
                );

                metrics.controllerDepotLevels.maxValue = this.controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.capacity || 0;
                metrics.controllerDepotLevels.update(
                    this.controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.capacityUsed || 0
                );

                metrics.controllerDepotFillRate.maxValue = this.controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.capacity || 0;
                metrics.controllerDepotFillRate.update(
                    this.controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.capacityUsed || 0
                );

                metrics.spawnUtilization.maxValue = this.hrAnalyst.getSpawns(office).length;
                metrics.spawnUtilization.update(this.hrAnalyst.getSpawns(office).filter(s => s.gameObj?.spawning).length);

                let building = 0;
                let repairing = 0;
                let upgrading = 0;
                let deathLosses = 0;
                [office.center, ...office.territories]
                    .map(t => t.room)
                    .forEach(room => {
                        if (!room) return;
                        room.getEventLog().forEach(event => {
                            switch (event.event) {
                                case EVENT_BUILD:
                                    building += event.data.energySpent;
                                    break;
                                case EVENT_REPAIR:
                                    repairing += event.data.energySpent;
                                    break;
                                case EVENT_UPGRADE_CONTROLLER:
                                    upgrading += event.data.energySpent;
                                    break;
                            }
                        })
                        deathLosses += this.logisticsAnalyst.getTombstones(room.name)
                                                       .filter(t => t.gameObj?.creep.my && t.gameObj?.deathTime === Game.time - 1)
                                                       .reduce((sum, t) => sum + t.capacityUsed, 0)
                    })
                metrics.buildRate.update(building);
                metrics.repairRate.update(repairing);
                metrics.upgradeRate.update(upgrading);
                metrics.deathLossesRate.update(deathLosses);
            }
        })
    }
    report = () => {
        this.boardroom.offices.forEach(office => {
            let metrics = this.metrics.get(office.name)
            if (!metrics) return;
            console.log(`Statistics for ${office.name}:
    Mine Rate: ${metrics.mineRate.mean().toFixed(2)} units/tick
    Mine Container Levels: ${metrics.mineContainerLevels.mean().toFixed(2)} (${(metrics.mineContainerLevels.asPercentMean()*100).toFixed(2)}%)
    Room Energy Levels: ${metrics.roomEnergyLevels.mean().toFixed(2)} (${(metrics.roomEnergyLevels.asPercentMean()*100).toFixed(2)}%)
    Storage Levels: ${metrics.storageLevels.mean().toFixed(2)} (${(metrics.storageLevels.asPercentMean()*100).toFixed(2)}%)
    Controller Depot Levels: ${metrics.controllerDepotLevels.mean().toFixed(2)} (${(metrics.controllerDepotLevels.asPercentMean()*100).toFixed(2)}%)
    Controller Depot Fill Rate: ${metrics.controllerDepotFillRate.mean().toFixed(2)} units/tick
    Logistics Throughput: ${metrics.logisticsThroughput.mean().toFixed(2)} units/tick
            `)
        })
    }
}
