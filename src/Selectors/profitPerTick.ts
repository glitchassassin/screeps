import { Objective, Objectives } from "Objectives/Objective";

const PROFIT_ADJUSTMENT = 0.9

export const profitPerTick = (office: string, exclude?: Objective) => {
    return Object.values(Objectives).reduce((sum, o) =>
        sum + (exclude?.id !== o.id ? o.energyValue(office) : 0
    ), 0) * PROFIT_ADJUSTMENT
}
