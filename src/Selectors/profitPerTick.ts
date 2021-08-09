import { Objective } from "Objectives/Objective";
import { memoizeByTick } from "utils/memoizeFunction";

const PROFIT_ADJUSTMENT = 0.9

export const profitPerTick = memoizeByTick(
    (office: string, exclude?: Objective) => office + exclude?.id,
    (office: string, exclude?: Objective) => {
    return Object.entries(Memory.stats.offices[office]?.objectives ?? {})
        .filter(([id]) => id !== exclude?.id)
        .reduce((sum, [id, o]) => sum + o.energy, 0) * PROFIT_ADJUSTMENT
})
