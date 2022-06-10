import { heapMetrics } from "Metrics/heapMetrics";
import { Metrics } from "screeps-viz";
import { franchiseIncomePerTick } from "./franchiseStatsPerTick";
import { getStorageBudget } from "./getStorageBudget";
import { getTerritoriesByOffice } from "./getTerritoriesByOffice";
import { roomPlans } from "./roomPlans";
import { storageEnergyAvailable } from "./storageEnergyAvailable";

export function calculateBaselineEnergy(office: string) {
    const base = (Game.rooms[office].energyAvailable < 300 ? 1 : 0) + franchiseIncomePerTick(office)

    if (!roomPlans(office)?.headquarters?.storage.structure) return base;
    // Adjust for storage surplus
    const storageBudget = getStorageBudget(office);
    // 0 = 80% of budget
    // 1 = 100% of budget
    // 2 = 200% of budget
    // 3 = 300% of budget
    // Etc.
    let storageLevel = heapMetrics[office]?.storageLevel ? Metrics.avg(heapMetrics[office].storageLevel) : storageEnergyAvailable(office)
    // By default we increase savings through balancing logistics haulers
    // If we have links and no remotes, we aren't using haulers, so we need
    // to adjust our budget here
    const minAdjustment = (roomPlans(office)?.franchise2?.link.structure && getTerritoriesByOffice(office).length === 0) ? 0.8 : 1;
    let storageAdjustment = Math.max(minAdjustment,
        storageLevel / storageBudget
    )
    return base * storageAdjustment;
}
