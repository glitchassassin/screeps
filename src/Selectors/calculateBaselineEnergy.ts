import { heapMetrics } from "Metrics/heapMetrics";
import { Metrics } from "screeps-viz";
import { franchiseIncomePerTick } from "./franchiseStatsPerTick";
import { getStorageBudget } from "./getStorageBudget";
import { storageEnergyAvailable } from "./storageEnergyAvailable";

export function calculateBaselineEnergy(office: string) {
    const base = (Game.rooms[office].energyAvailable < 300 ? 1 : 0) + franchiseIncomePerTick(office)
    // Adjust for storage surplus
    const storageBudget = getStorageBudget(office);
    // 1 = 100% of budget
    // 2 = 200% of budget
    // 3 = 300% of budget
    // Etc.
    let storageLevel = heapMetrics[office]?.storageLevel ? Metrics.avg(heapMetrics[office].storageLevel) : storageEnergyAvailable(office)
    let storageAdjustment = Math.max(1,
        storageLevel / storageBudget
    )
    return base * storageAdjustment;
}
