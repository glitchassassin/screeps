import { BoardroomManager, BoardroomManagerMemory } from "Boardroom/BoardroomManager";
import { Type } from "class-transformer";
import { countEnergyInContainersOrGround } from "utils/gameObjectSelectors";
import { ControllerAnalyst } from "./ControllerAnalyst";
import { LogisticsAnalyst } from "./LogisticsAnalyst";
import { SalesAnalyst } from "./SalesAnalyst";

class asPercent {
    constructor(private parent: Metric) {}
    mean() { return (this.parent.mean() / this.parent.maxValue) }
    max() { return (this.parent.max() / this.parent.maxValue) }
    min() { return (this.parent.min() / this.parent.maxValue) }
}

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
    @Type(() => NonNegativeDeltaMetric)
    mineRate: NonNegativeDeltaMetric
    @Type(() => Metric)
    mineContainerLevels: Metric
    @Type(() => Metric)
    roomEnergyLevels: Metric
    @Type(() => Metric)
    storageLevels: Metric
    @Type(() => Metric)
    controllerDepotLevels: Metric
    @Type(() => DeltaMetric)
    controllerDepotFillRate: DeltaMetric
    constructor(
        mineRate: NonNegativeDeltaMetric,
        mineContainerLevels: Metric,
        roomEnergyLevels: Metric,
        storageLevels: Metric,
        controllerDepotLevels: Metric,
        controllerDepotFillRate: DeltaMetric,
    ) {
        this.mineRate = mineRate;
        this.mineContainerLevels = mineContainerLevels;
        this.roomEnergyLevels = roomEnergyLevels;
        this.storageLevels = storageLevels;
        this.controllerDepotLevels = controllerDepotLevels;
        this.controllerDepotFillRate = controllerDepotFillRate;
    }
}

class StatisticsAnalystMemory extends BoardroomManagerMemory {
    @Type(() => PipelineMetrics)
    public metrics: Map<string, PipelineMetrics> = new Map();
}

export class StatisticsAnalyst extends BoardroomManager {
    cache = new StatisticsAnalystMemory();

    plan() {
        let salesAnalyst = this.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        let logisticsAnalyst = this.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let controllerAnalyst = this.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;

        this.boardroom.offices.forEach(office => {
            if (!this.cache.metrics.has(office.name)) {
                this.cache.metrics.set(office.name,  new PipelineMetrics(
                    new NonNegativeDeltaMetric( // mineRate
                        salesAnalyst.getFranchiseLocations(office)
                            .reduce((sum, source) => (sum + (source.source?.energyCapacity || 0)), 0),
                        50
                    ),
                    new Metric( // mineContainerLevels
                        salesAnalyst.getFranchiseLocations(office)
                            .reduce((sum, mine) => (sum + (mine.container?.store.getCapacity() || 0)), 0),
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
                    new Metric( // controllerDepotLevels
                        controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.store.getCapacity() || 0,
                        50
                    ),
                    new DeltaMetric( // controllerDepotFillRate
                        controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.store.getUsedCapacity() || 0,
                        50
                    )
                ));
            } else {
                let metrics = this.cache.metrics.get(office.name) as PipelineMetrics;
                metrics.mineRate.update(
                    salesAnalyst.getFranchiseLocations(office)
                        .reduce((sum, source) => (sum + (source.source?.energy || 0)), 0)
                );
                metrics.mineContainerLevels.update(
                    salesAnalyst.getFranchiseLocations(office)
                        .reduce((sum, mine) => (sum + countEnergyInContainersOrGround(mine.sourcePos)), 0)
                );
                metrics.roomEnergyLevels.update(office.center.room.energyAvailable);
                metrics.storageLevels.update(
                    logisticsAnalyst.getStorage(office)
                        .reduce((sum, container) => (sum + container.store.getUsedCapacity()), 0)
                );
                metrics.controllerDepotLevels.update(
                    controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.store.getUsedCapacity() || 0
                );
                metrics.controllerDepotFillRate.update(
                    controllerAnalyst.getDesignatedUpgradingLocations(office)?.container?.store.getUsedCapacity() || 0
                );
            }
        })
    }
    report = () => {
        this.boardroom.offices.forEach(office => {
            let metrics = this.cache.metrics.get(office.name)
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
