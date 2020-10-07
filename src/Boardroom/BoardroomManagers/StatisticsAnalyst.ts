import { BoardroomManager } from "Boardroom/BoardroomManager";
import { countEnergyInContainersOrGround } from "utils/gameObjectSelectors";
import { ControllerAnalyst } from "./ControllerAnalyst";
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
        public storageLevels: Metric,
        public fleetLevels: Metric,
        public mobileDepotLevels: Metric,
        public controllerDepotLevels: Metric,
        public controllerDepotFillRate: DeltaMetric,
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
        let logisticsAnalyst = this.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let controllerAnalyst = this.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;

        this.boardroom.offices.forEach(office => {
            if (!this.metrics.has(office.name)) {
                this.metrics.set(office.name,  new PipelineMetrics(
                    new NonNegativeDeltaMetric( // mineRate
                        salesAnalyst.getFranchiseLocations(office)
                            .reduce((sum, source) => (sum + (source.source?.energyCapacity || 0)), 0),
                        50
                    ),
                    new Metric( // mineContainerLevels
                        salesAnalyst.getFranchiseLocations(office).length * CONTAINER_CAPACITY,
                        50
                    ),
                    new Metric( // roomEnergyLevels
                        office.center.room.energyCapacityAvailable,
                        50
                    ),
                    new Metric( // storageLevels
                        logisticsAnalyst.getStorage(office).reduce((sum, storage) => (sum + storage.store.getCapacity()), 0),
                        50
                    ),
                    new Metric( // fleetLevels
                        logisticsAnalyst.getCarriers(office).reduce((sum, creep) => (sum + creep.store.getCapacity()), 0),
                        50
                    ),
                    new Metric( // mobileDepotLevels
                        logisticsAnalyst.depots.get(office.name)?.reduce((sum, creep) => (sum + creep.store.getCapacity()), 0) ?? 0,
                        50
                    ),
                    new Metric( // controllerDepotLevels
                        controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.store.getCapacity() || 0,
                        50
                    ),
                    new DeltaMetric( // controllerDepotFillRate
                        controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.store.getCapacity() || 0,
                        50
                    )
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

                metrics.storageLevels.maxValue = logisticsAnalyst.getStorage(office).reduce((sum, storage) => (sum + storage.store.getCapacity()), 0);
                metrics.storageLevels.update(
                    logisticsAnalyst.getStorage(office)
                        .reduce((sum, storage) => (sum + storage.store.getUsedCapacity()), 0)
                );

                metrics.fleetLevels.maxValue = logisticsAnalyst.getCarriers(office).reduce((sum, creep) => (sum + creep.store.getCapacity()), 0);
                metrics.fleetLevels.update(
                    logisticsAnalyst.getCarriers(office)
                        .reduce((sum, creep) => (sum + creep.store.getUsedCapacity()), 0)
                );

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
            `)
        })
    }
}
