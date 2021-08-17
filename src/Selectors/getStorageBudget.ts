import { STORAGE_LEVEL } from "config"
import { BUILD_COSTS_BY_RCL } from "gameConstants"

export const getStorageBudget = (rcl: number) => {
    return (STORAGE_LEVEL[rcl] ?? 0) + (BUILD_COSTS_BY_RCL[rcl] ?? 0)
}
