import { Office } from "Office/Office";
import { Memoize } from "typescript-memoize";
import { Analyst } from "./Analyst";

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
    asPercent = {
        mean: () => (this.mean() / this.maxValue),
        max: () => (this.max() / this.maxValue),
        min: () => (this.min() / this.maxValue),
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

export type PipelineMetrics = {
    mineRate: NonNegativeDeltaMetric,
    mineContainerLevels: Metric,
    roomEnergyLevels: Metric,
    storageLevels: Metric,
    controllerDepotLevels: Metric,
    controllerDepotFillRate: DeltaMetric,
}

export class StatisticsAnalyst extends Analyst {
    metrics: {[roomName: string]: PipelineMetrics} = {};

    init = (office: Office) => {
        if (!this.metrics[office.name]) {
            this.metrics[office.name] = {
                mineRate: new NonNegativeDeltaMetric(
                    global.analysts.sales.getSources(office)
                        .reduce((sum, source) => (sum + source.energyCapacity), 0),
                    50
                ),
                mineContainerLevels: new Metric(
                    global.analysts.sales.getFranchiseLocations(office)
                        .reduce((sum, mine) => (sum + (mine.container?.store.getCapacity() || 0)), 0),
                    50
                ),
                roomEnergyLevels: new Metric(
                    office.center.room.energyCapacityAvailable,
                    50
                ),
                storageLevels: new Metric(
                    global.analysts.logistics.getStorage(office).reduce((sum, storage) => (sum + storage.store.getCapacity()), 0),
                    50
                ),
                controllerDepotLevels: new Metric(
                    global.analysts.controller.getDesignatedUpgradingLocations(office)?.container?.store.getCapacity() || 0,
                    50
                ),
                controllerDepotFillRate: new DeltaMetric(
                    global.analysts.controller.getDesignatedUpgradingLocations(office)?.container?.store.getUsedCapacity() || 0,
                    50
                )
            }
        }
    }
    cleanup = (office: Office) => {
        this.metrics[office.name].mineRate.update(
            global.analysts.sales.getSources(office)
                .reduce((sum, source) => (sum + source.energy), 0)
        );
        this.metrics[office.name].mineContainerLevels.update(
            global.analysts.sales.getFranchiseLocations(office)
                .reduce((sum, mine) => (sum + (mine.container?.store.getUsedCapacity() || 0)), 0)
        );
        this.metrics[office.name].roomEnergyLevels.update(office.center.room.energyAvailable);
        this.metrics[office.name].storageLevels.update(
            global.analysts.logistics.getStorage(office)
                .reduce((sum, container) => (sum + container.store.getUsedCapacity()), 0)
        );
        this.metrics[office.name].controllerDepotLevels.update(
            global.analysts.controller.getDesignatedUpgradingLocations(office)?.container?.store.getUsedCapacity() || 0
        );
        this.metrics[office.name].controllerDepotFillRate.update(
            global.analysts.controller.getDesignatedUpgradingLocations(office)?.container?.store.getUsedCapacity() || 0
        );
    }
    report = () => {
        Object.values(Game.rooms).forEach(room => {
            console.log(`Statistics for ${room.name}:
    Mine Rate: ${this.metrics[room.name].mineRate.mean().toFixed(2)} units/tick
    Mine Container Levels: ${this.metrics[room.name].mineContainerLevels.mean().toFixed(2)} (${(this.metrics[room.name].mineContainerLevels.asPercent.mean()*100).toFixed(2)}%)
    Room Energy Levels: ${this.metrics[room.name].roomEnergyLevels.mean().toFixed(2)} (${(this.metrics[room.name].roomEnergyLevels.asPercent.mean()*100).toFixed(2)}%)
    Storage Levels: ${this.metrics[room.name].storageLevels.mean().toFixed(2)} (${(this.metrics[room.name].storageLevels.asPercent.mean()*100).toFixed(2)}%)
    Controller Depot Levels: ${this.metrics[room.name].controllerDepotLevels.mean().toFixed(2)} (${(this.metrics[room.name].controllerDepotLevels.asPercent.mean()*100).toFixed(2)}%)
    Controller Depot Fill Rate: ${this.metrics[room.name].controllerDepotFillRate.mean().toFixed(2)} units/tick
            `)
        })
    }
}
