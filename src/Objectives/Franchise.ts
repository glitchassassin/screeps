import { MinionTypes } from "Minions/minionTypes";
import { Objective } from "./Objective";
import { byId } from "Selectors/byId";
import { findFranchiseTarget } from "Selectors/findFranchiseTarget";
import { getFranchisePlanBySourceId } from "Selectors/roomPlans";
import { moveTo } from "Behaviors/moveTo";
import { posById } from "Selectors/posById";

declare global {
    interface CreepMemory {
        franchiseTarget?: Id<Source>
    }
}

export class FranchiseObjective extends Objective {
    minionTypes = [MinionTypes.SALESMAN];

    action = (creep: Creep) => {
        if (!creep.memory.franchiseTarget) {
            // Look for an available target
            creep.memory.franchiseTarget = findFranchiseTarget(creep);
        }

        if (creep.memory.franchiseTarget) {
            const plan = getFranchisePlanBySourceId(creep.memory.franchiseTarget)
            const source = byId(creep.memory.franchiseTarget);
            const sourcePos = posById(creep.memory.franchiseTarget);

            if (!sourcePos) throw new Error(`No matching source pos for ${creep.memory.franchiseTarget} in cache`)
            if (Game.rooms[sourcePos.roomName] && !source) throw new Error (`Source at ${sourcePos} has disappeared?`)
            if (!plan) throw new Error(`No room plan for harvesting source ${creep.memory.franchiseTarget}`)

            // Prefer to work from container position, fall back to adjacent position
            if (
                !creep.pos.isEqualTo(plan.container.pos) &&
                plan.container.pos.lookFor(LOOK_CREEPS).length === 0
            ) {
                moveTo(plan.container.pos, 0)(creep);
            } else if (!creep.pos.isNearTo(sourcePos!)) {
                moveTo(sourcePos, 1)(creep);
            }

            creep.harvest(source!);

            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) > creep.store.getCapacity(RESOURCE_ENERGY) * 0.8) {
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
}

