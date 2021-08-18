import { memoizeByTick } from "utils/memoizeFunction";
import { rcl } from "./rcl";
import { getEnergyStructures } from "./spawnsAndExtensionsDemand";

export const getActualEnergyAvailable = memoizeByTick(
    office => office,
    (office: string) => {
        if (Memory.rooms[office].rclMilestones?.[rcl(office) + 1]) {
            // Room is down-leveled, get capacity from active spawns/extensions
            return getEnergyStructures(office).reduce((sum, s) => sum + s.store.getUsedCapacity(RESOURCE_ENERGY), 0)
        }
        return Game.rooms[office]?.energyAvailable ?? 0
    }
)
