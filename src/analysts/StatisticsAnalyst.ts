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
        return this.values.reduce((a, b) => Math.max(a, b));
    }
    min() {
        return this.values.reduce((a, b) => Math.min(a, b));
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
    outputContainerLevels: Metric,
    controllerDepotFillRate: DeltaMetric,
}

export class StatisticsAnalyst extends Analyst {
    metrics: {[roomName: string]: PipelineMetrics} = {};

    init = (room: Room) => {
        if (!this.metrics[room.name]) {
            this.metrics[room.name] = {
                mineRate: new NonNegativeDeltaMetric(
                    global.analysts.source.getSources(room)
                        .reduce((sum, source) => (sum + source.energyCapacity), 0),
                    50
                ),
                mineContainerLevels: new Metric(
                    global.analysts.source.getDesignatedMiningLocations(room)
                        .reduce((sum, mine) => (sum + (mine.container?.store.getCapacity() || 0)), 0),
                    50
                ),
                roomEnergyLevels: new Metric(
                    room.energyCapacityAvailable,
                    50
                ),
                outputContainerLevels: new Metric(
                    global.analysts.logistics.getOutputContainers(room)
                        .reduce((sum, container) => (sum + container.store.getCapacity()), 0),
                    50
                ),
                controllerDepotFillRate: new DeltaMetric(
                    global.analysts.controller.getDesignatedUpgradingLocations(room)?.container?.store.getUsedCapacity() || 0,
                    50
                )
            }
        }
    }
    cleanup = (room: Room) => {
        this.metrics[room.name].mineRate.update(
            global.analysts.source.getSources(room)
                .reduce((sum, source) => (sum + source.energy), 0)
        );
        this.metrics[room.name].mineContainerLevels.update(
            global.analysts.source.getDesignatedMiningLocations(room)
                .reduce((sum, mine) => (sum + (mine.container?.store.getUsedCapacity() || 0)), 0)
        );
        this.metrics[room.name].roomEnergyLevels.update(room.energyAvailable);
        this.metrics[room.name].outputContainerLevels.update(
            global.analysts.logistics.getOutputContainers(room)
                .reduce((sum, container) => (sum + container.store.getUsedCapacity()), 0)
        );
        this.metrics[room.name].controllerDepotFillRate.update(
            global.analysts.controller.getDesignatedUpgradingLocations(room)?.container?.store.getUsedCapacity() || 0
        );
    }
    report = () => {
        Object.values(Game.rooms).forEach(room => {
            console.log(`Statistics for ${room.name}:
    Mine Rate: ${this.metrics[room.name].mineRate.mean().toFixed(2)} units/tick
    Mine Container Levels: ${this.metrics[room.name].mineContainerLevels.mean().toFixed(2)} (${(this.metrics[room.name].mineContainerLevels.asPercent.mean()*100).toFixed(2)}%)
    Room Energy Levels: ${this.metrics[room.name].roomEnergyLevels.mean().toFixed(2)} (${(this.metrics[room.name].roomEnergyLevels.asPercent.mean()*100).toFixed(2)}%)
    Output Container Levels: ${this.metrics[room.name].outputContainerLevels.mean().toFixed(2)} (${(this.metrics[room.name].outputContainerLevels.asPercent.mean()*100).toFixed(2)}%)
    Controller Depot Fill Rate: ${this.metrics[room.name].controllerDepotFillRate.mean().toFixed(2)} units/tick
            `)
        })
    }
}
