import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { posById } from "Selectors/posById";
import { resourcesNearPos } from "Selectors/resourcesNearPos";
import { getFranchisePlanBySourceId } from "Selectors/roomPlans";
import profiler from "utils/profiler";
import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";

export const getEnergyFromFranchise = profiler.registerFN((creep: Creep, franchise?: Id<Source>) => {
    // Default to specified franchise
    creep.memory.depositSource ??= franchise;

    if (!creep.memory.depositSource) {
        return BehaviorResult.FAILURE; // No sources found
    }

    const pos = posById(creep.memory.depositSource);
    if (!pos) return BehaviorResult.FAILURE;

    if (franchiseEnergyAvailable(creep.memory.depositSource) <= 50 || creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.depositSource = undefined; // Franchise drained, return to storage
        return BehaviorResult.SUCCESS;
    } else {
        // First, pick up from container
        const container = getFranchisePlanBySourceId(creep.memory.depositSource)?.container.structure as StructureContainer | undefined
        const resources = resourcesNearPos(pos, 1, RESOURCE_ENERGY);
        if (container && container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (moveTo(creep, { pos: container.pos, range: 1 }) === BehaviorResult.SUCCESS) {
                creep.withdraw(container, RESOURCE_ENERGY)
            }
        } else if (resources.length > 0) {
            // Otherwise, pick up loose resources
            const res = resources.shift();
            if (res) {
                if (moveTo(creep, { pos: res.pos, range: 1 }) === BehaviorResult.SUCCESS) {
                    creep.pickup(res)
                }
            }
        }
    }

    return BehaviorResult.INPROGRESS;
}, 'getEnergyFromFranchise')
