import { Metrics } from "screeps-viz";

interface HeapMetrics {
    roomEnergy: Metrics.Timeseries
    buildEfficiency: Metrics.Timeseries
    storageLevel: Metrics.Timeseries
}

export const heapMetrics: Record<string, HeapMetrics> = {};
