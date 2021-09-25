import { STORAGE_LEVEL } from "config";
import { BUILD_COSTS_BY_RCL } from "gameConstants";
import { rcl } from "./rcl";
import { roomPlans } from "./roomPlans";

export const getStorageBudget = (office: string) => {
    if (!roomPlans(office)?.headquarters?.storage.structure) return CONTAINER_CAPACITY * 0.5;
    return Math.min(STORAGE_CAPACITY * 0.8, (STORAGE_LEVEL[rcl(office)] ?? 0) + (BUILD_COSTS_BY_RCL[rcl(office)] ?? 0))
}
