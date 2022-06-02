import { heapMetrics } from "Metrics/heapMetrics";
import { LogisticsObjective } from "Objectives/Logistics";
import { Objectives } from "Objectives/Objective";
import { Metrics } from "screeps-viz";
import { memoizeByTick } from "utils/memoizeFunction";
import { franchiseCount, franchiseDistances } from "./franchiseStatsPerTick";
import { getStorageBudget } from "./getStorageBudget";
import { storageEnergyAvailable } from "./storageEnergyAvailable";

export const calculateLogisticsThroughput = memoizeByTick(
    office => office,
    (office: string) => {
        const carry = (Objectives['LogisticsObjective'] as LogisticsObjective).actualCarry(office) * CARRY_CAPACITY
        const averageDistance = franchiseDistances(office) / franchiseCount(office);

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

        // console.log('calculateLogisticsThroughput', storageAdjustment)

        return (carry / (averageDistance * 2)) * storageAdjustment;
    }
)
