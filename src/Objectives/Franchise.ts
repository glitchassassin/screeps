import { MinionTypes } from "Minions/minionTypes";
import { Objective } from "./Objective";
import { getFranchisePlanBySourceId } from "Selectors/roomPlans";
import { harvestEnergyFromFranchise } from "Behaviors/harvestEnergyFromFranchise";

export class FranchiseObjective extends Objective {
    minionTypes = [MinionTypes.SALESMAN];

    action = (creep: Creep) => {
        harvestEnergyFromFranchise(creep);

        if (creep.memory.franchiseTarget && creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) * 0.8) {
            const plan = getFranchisePlanBySourceId(creep.memory.franchiseTarget)
            if (!plan) return;

            // Try to deposit at spawn
            let result: ScreepsReturnCode = ERR_FULL
            if (plan.spawn.structure) {
                result = creep.transfer(plan.spawn.structure, RESOURCE_ENERGY)
            }
            if (result !== OK && plan.link.structure) {
                creep.transfer(plan.link.structure, RESOURCE_ENERGY)
            }
        }
    }
}

