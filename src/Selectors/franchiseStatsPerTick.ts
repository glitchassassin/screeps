import { FranchiseObjective } from "Objectives/Franchise";
import { Objectives } from "Objectives/Objective";
import { memoizeByTick } from "utils/memoizeFunction";

export const franchiseIncomePerTick = (office: string) => {
    return franchiseStatsPerTick(office).income;
}
export const franchiseDistances = (office: string) => {
    return franchiseStatsPerTick(office).distance;
}
export const franchiseCount = (office: string) => {
    return franchiseStatsPerTick(office).count;
}

export const franchiseStatsPerTick = memoizeByTick(
    office => office,
    (office: string) => {
        let stats = {
            income: 0,
            distance: 0,
            count: 0,
        };
        for (let o in Objectives) {
            let objective = Objectives[o]
            if (objective instanceof FranchiseObjective && objective.office === office) {
                stats.income += objective.energyValue(office)
                stats.distance += objective.distance
                stats.count += 1
            }
        }
        return stats;
    }
)
