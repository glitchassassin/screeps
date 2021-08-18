import { STORAGE_LEVEL } from "config"
import { BUILD_COSTS_BY_RCL } from "gameConstants"

export const getStorageBudget = (rcl: number) => {
    return Math.min(STORAGE_CAPACITY * 0.8, (STORAGE_LEVEL[rcl] ?? 0) + (BUILD_COSTS_BY_RCL[rcl] ?? 0))
}
