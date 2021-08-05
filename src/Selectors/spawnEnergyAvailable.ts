import { Metrics } from "screeps-viz";
import { heapMetrics } from "Metrics/heapMetrics";

export const spawnEnergyAvailable = (room: string) => {
    return Math.max(
        300,
        heapMetrics[room] ? Metrics.max(heapMetrics[room].roomEnergy)[1] : (Game.rooms[room]?.energyCapacityAvailable ?? 0)
    );
}
