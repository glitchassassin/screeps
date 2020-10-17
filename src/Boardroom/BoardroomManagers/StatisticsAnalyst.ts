import { BoardroomManager } from "Boardroom/BoardroomManager";
import { countEnergyInContainersOrGround } from "utils/gameObjectSelectors";
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
    metrics: Map<string, PipelineMetrics> = new Map();

    reset() {
        this.metrics = new Map();
        Memory.boardroom.StatisticsAnalyst = "";
    }

    plan() {
        let salesAnalyst = this.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let logisticsAnalyst = this.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let controllerAnalyst = this.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;

        this.boardroom.offices.forEach(office => {
            if (!this.metrics.has(office.name)) {
                this.metrics.set(office.name,  new PipelineMetrics(
                    new NonNegativeDeltaMetric( // mineRate
                        salesAnalyst.getFranchiseLocations(office)
                            .reduce((sum, source) => (sum + (source.source?.energyCapacity || 0)), 0),
                        500
                    ),
                    new Metric( // mineContainerLevels
                        salesAnalyst.getFranchiseLocations(office).length * CONTAINER_CAPACITY,
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
                        logisticsAnalyst.getStorage(office).reduce((sum, storage) => (sum + storage.store.getCapacity()), 0),
                        100
                    ),
                    new DeltaMetric( // storageFillRate
                        100,
                        500
                    ),
                    new Metric( // fleetLevels
                        logisticsAnalyst.getCarriers(office).reduce((sum, creep) => (sum + creep.store.getCapacity()), 0),
                        100
                    ),
                    new Metric( // mobileDepotLevels
                        logisticsAnalyst.depots.get(office.name)?.reduce((sum, creep) => (sum + creep.store.getCapacity()), 0) ?? 0,
                        100
                    ),
                    new Metric( // controllerDepotLevels
                        controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.store.getCapacity() || 0,
                        100
                    ),
                    new DeltaMetric( // controllerDepotFillRate
                        controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.store.getCapacity() || 0,
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
                metrics.mineRate.maxValue = salesAnalyst.getFranchiseLocations(office)
                    .reduce((sum, source) => (sum + (source.source?.energyCapacity || 0)), 0)
                metrics.mineRate.update(
                    salesAnalyst.getFranchiseLocations(office)
                        .reduce((sum, source) => (sum + (source.source?.energy || 0)), 0)
                );

                metrics.mineContainerLevels.maxValue = salesAnalyst.getFranchiseLocations(office).length * CONTAINER_CAPACITY;
                metrics.mineContainerLevels.update(
                    salesAnalyst.getFranchiseLocations(office)
                        .reduce((sum, mine) => (sum + countEnergyInContainersOrGround(mine.sourcePos)), 0)
                );

                metrics.roomEnergyLevels.maxValue = office.center.room.energyCapacityAvailable;
                metrics.roomEnergyLevels.update(office.center.room.energyAvailable);
                metrics.spawnEnergyRate.update(office.center.room.energyAvailable);

                metrics.storageLevels.maxValue = logisticsAnalyst.getStorage(office).reduce((sum, storage) => (sum + storage.store.getCapacity()), 0);
                metrics.storageLevels.update(
                    logisticsAnalyst.getStorage(office)
                        .reduce((sum, storage) => (sum + storage.store.getUsedCapacity()), 0)
                );
                metrics.storageFillRate.update(
                    logisticsAnalyst.getStorage(office)
                        .reduce((sum, storage) => (sum + storage.store.getUsedCapacity()), 0)
                );

                metrics.fleetLevels.maxValue = logisticsAnalyst.getCarriers(office).reduce((sum, creep) => (sum + creep.store.getCapacity()), 0);
                let fleetLevel = logisticsAnalyst.getCarriers(office)
                    .reduce((sum, creep) => (sum + creep.store.getUsedCapacity()), 0)
                metrics.fleetLevels.update(fleetLevel);
                metrics.logisticsThroughput.update(fleetLevel);

                metrics.mobileDepotLevels.maxValue = logisticsAnalyst.depots.get(office.name)?.reduce((sum, creep) => (sum + creep.store.getCapacity()), 0) ?? 0;
                metrics.mobileDepotLevels.update(
                    logisticsAnalyst.depots.get(office.name)?.reduce((sum, creep) => (sum + creep.store.getUsedCapacity()), 0) ?? 0
                );

                metrics.controllerDepotLevels.maxValue = controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.store.getCapacity() || 0;
                metrics.controllerDepotLevels.update(
                    controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.store.getUsedCapacity() || 0
                );

                metrics.controllerDepotFillRate.maxValue = controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.store.getCapacity() || 0;
                metrics.controllerDepotFillRate.update(
                    controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.store.getUsedCapacity() || 0
                );

                metrics.spawnUtilization.maxValue = hrAnalyst.getSpawns(office).length;
                metrics.spawnUtilization.update(hrAnalyst.getSpawns(office).filter(s => s.spawning).length);

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
                        deathLosses += logisticsAnalyst.getTombstones(room)
                                                       .filter(t => t.creep.my && t.deathTime === Game.time - 1)
                                                       .reduce((sum, t) => sum + t.store.getUsedCapacity(RESOURCE_ENERGY), 0)
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
