import { Metrics } from 'screeps-viz';

interface HeapMetrics {
  roomEnergy: Metrics.Timeseries;
  spawnEfficiency: Metrics.Timeseries;
}

export const heapMetrics: Record<string, HeapMetrics> = {};
