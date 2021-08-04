import { Objective, Objectives } from "Objectives/Objective";

export const profitPerTick = (office: string, exclude?: Objective) => {
    return Object.values(Objectives).reduce((sum, o) =>
        sum + (exclude?.id !== o.id ? o.energyValue(office) : 0
    ), 0)
}
