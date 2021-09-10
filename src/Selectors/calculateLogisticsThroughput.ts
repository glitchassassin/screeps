import { LogisticsObjective } from "Objectives/Logistics";
import { Objectives } from "Objectives/Objective";
import { franchiseCount, franchiseDistances } from "./franchiseStatsPerTick";

export function calculateLogisticsThroughput(office: string) {
    const carry = (Objectives['LogisticsObjective'] as LogisticsObjective).actualCarry(office) * CARRY_CAPACITY
    const averageDistance = franchiseDistances(office) / franchiseCount(office);
    return carry / (averageDistance * 2);
}
