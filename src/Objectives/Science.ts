import { States } from "Behaviors/states";
import { MinionBuilders, MinionTypes } from "Minions/minionTypes";
import { spawnMinion } from "Minions/spawnMinion";
import { byId } from "Selectors/byId";
import { ingredientForLabsObjective } from "Selectors/ingredientForLabsObjective";
import { minionCostPerTick } from "Selectors/minionCostPerTick";
import { rcl } from "Selectors/rcl";
import { roomPlans } from "Selectors/roomPlans";
import { spawnEnergyAvailable } from "Selectors/spawnEnergyAvailable";
import profiler from "utils/profiler";
import { Objective } from "./Objective";


declare global {
    interface CreepMemory {
        scienceIngredients?: ResourceConstant[]
        scienceProduct?: ResourceConstant
    }
}

/**
 * Picks up energy from Sources and transfers it to Storage
 */
export class ScienceObjective extends Objective {
    energyValue(office: string) {
        return -(minionCostPerTick(MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office))))
    }
    spawn() {
        for (let office in Memory.offices) {
            if (rcl(office) < 6 || roomPlans(office)?.labs?.labs.every(e => !e.structure)) continue; // No labs
            const scientists = this.assigned.map(byId).filter(c =>
                c?.memory.office === office &&
                (!c.ticksToLive || c.ticksToLive > 100)
            ).length

            if (scientists < 1) {
                spawnMinion(
                    office,
                    this.id,
                    MinionTypes.ACCOUNTANT,
                    MinionBuilders[MinionTypes.ACCOUNTANT](spawnEnergyAvailable(office))
                )({ preferredSpawn: roomPlans(office)?.headquarters?.spawn.structure as StructureSpawn })
            }
        }
    }

    action(creep: Creep) {
        if (!creep.memory.state) {

        }

        if (creep.memory.state === States.WITHDRAW) {
            if (!creep.memory.scienceIngredients) {
                creep.memory.scienceIngredients = ingredientForLabsObjective(creep.memory.office)
            }
        }
    }
}

profiler.registerClass(ScienceObjective, 'ScienceObjective')
