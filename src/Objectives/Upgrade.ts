import { States, setState } from "Behaviors/states";

import { BehaviorResult } from "Behaviors/Behavior";
import { MinionTypes } from "Minions/minionTypes";
import { Objective } from "./Objective";
import { getEnergyFromStorage } from "Behaviors/getEnergyFromStorage";
import { moveTo } from "Behaviors/moveTo";
import { resetCreep } from "Selectors/resetCreep";
import { roomPlans } from "Selectors/roomPlans";

export class UpgradeObjective extends Objective {
    minionTypes = [MinionTypes.PARALEGAL, MinionTypes.ENGINEER];

    action = (creep: Creep) => {
        if (!creep.memory.state || creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            setState(States.GET_ENERGY)(creep);
        }
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            setState(States.WORKING)(creep);
        }
        if (creep.memory.state === States.GET_ENERGY) {
            const container = roomPlans(creep.memory.office)?.office.headquarters.container;
            if (!container) return;
            if (container.structure) {
                moveTo(container.pos, 1)(creep);
                if (creep.withdraw(container.structure, RESOURCE_ENERGY) === OK) {
                    setState(States.WORKING);
                }
            } else {
                if (getEnergyFromStorage(creep) === BehaviorResult.SUCCESS) {
                    setState(States.WORKING);
                }
            }
        }
        if (creep.memory.state === States.WORKING) {
            const controller = Game.rooms[creep.memory.office].controller
            if (!controller) return;
            moveTo(controller.pos, 3)(creep);
            if (creep.upgradeController(controller) == ERR_NOT_ENOUGH_ENERGY) {
                resetCreep(creep); // Free creep for another task
                return;
            }
        }
    }
}

