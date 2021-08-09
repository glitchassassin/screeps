import { heapMetrics } from "Metrics/heapMetrics";
import { Metrics } from "screeps-viz";
import { memoizeByTick } from "utils/memoizeFunction";

export const spawnEnergyAvailable = memoizeByTick(
    (room: string) => room,
    (room: string) => {
    return Math.max(
        300,
        heapMetrics[room] ? Metrics.max(heapMetrics[room].roomEnergy)[1] : (Game.rooms[room]?.energyCapacityAvailable ?? 0)
    );
})
