import { Metrics as Viz } from "screeps-viz";

interface Metrics {
    roomEnergy: Viz.Timeseries
}

export const Metrics: Record<string, Metrics> = {};

export const recordMetrics = () => {
    for (let office in Memory.offices) {
        Metrics[office] ??= {
            roomEnergy: Viz.newTimeseries()
        }
        Viz.update(Metrics[office].roomEnergy, Game.rooms[office].energyAvailable ?? 0, 300);
    }
}
