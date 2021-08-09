import profiler from "screeps-profiler";
import { franchiseEnergyAvailable } from "Selectors/franchiseEnergyAvailable";
import { posById } from "Selectors/posById";
import { resourcesNearPos } from "Selectors/resourcesNearPos";
import { sourceIds } from "Selectors/roomCache";
import { getFranchisePlanBySourceId } from "Selectors/roomPlans";
import { BehaviorResult } from "./Behavior";
import { moveTo } from "./moveTo";

export const getEnergyFromFranchise = profiler.registerFN((creep: Creep, franchise?: Id<Source>) => {
    // Default to specified franchise
    creep.memory.depositSource ??= franchise;

    if (!creep.memory.depositSource) {
        // Select a new target: franchise with most surplus
        let maxSurplus = 0;
        for (let source of sourceIds(creep.memory.office)) {
            const surplus = franchiseEnergyAvailable(source);
            if (surplus > maxSurplus) {
                maxSurplus = surplus;
                creep.memory.depositSource = source;
            }
        }
    }

    if (!creep.memory.depositSource) {
        return BehaviorResult.FAILURE; // No sources found
    }

    const pos = posById(creep.memory.depositSource);
    if (!pos) return BehaviorResult.FAILURE;

    if (franchiseEnergyAvailable(creep.memory.depositSource) === 0 || creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.depositSource = undefined; // Franchise drained, return to storage
        return BehaviorResult.SUCCESS;
    } else {
        // First, pick up from container
        const container = getFranchisePlanBySourceId(creep.memory.depositSource)?.container.structure as StructureContainer | undefined
        if (container && container.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
            if (moveTo(container.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                creep.withdraw(container, RESOURCE_ENERGY)
            }
        } else {
            // Otherwise, pick up loose resources
            const res = resourcesNearPos(pos, 1, RESOURCE_ENERGY).shift();
            if (res) {
                if (moveTo(res.pos, 1)(creep) === BehaviorResult.SUCCESS) {
                    creep.pickup(res)
                }
            }
        }
    }

    return BehaviorResult.INPROGRESS;
}, 'getEnergyFromFranchise')
