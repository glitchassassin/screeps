import { FranchiseObjective } from "Objectives/Franchise"
import { Objectives } from "Objectives/Objective"

export const franchiseIncomePerTick = (office: string) => {
    return Object.values(Objectives)
        .filter(o => o instanceof FranchiseObjective && o.office === office)
        .reduce((sum, o) => sum + (o as FranchiseObjective).energyValue(office), 0)
}
