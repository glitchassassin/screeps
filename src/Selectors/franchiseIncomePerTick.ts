import { FranchiseObjective } from "Objectives/Franchise";
import { Objectives } from "Objectives/Objective";
import { memoizeByTick } from "utils/memoizeFunction";

export const franchiseIncomePerTick = memoizeByTick(
    office => office,
    (office: string) => {
        let sum = 0;
        for (let o in Objectives) {
            let objective = Objectives[o]
            if (objective instanceof FranchiseObjective && objective.office === office) {
                sum += objective.energyValue(office)
            }
        }
        return sum;
    }
)
