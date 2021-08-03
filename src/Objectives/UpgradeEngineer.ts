import { States, setState } from "Behaviors/states";

import { BehaviorResult } from "Behaviors/Behavior";
import { MinionTypes } from "Minions/minionTypes";
import { Objective } from "./Objective";
import { engineerGetEnergy } from "Behaviors/engineerGetEnergy";
import { moveTo } from "Behaviors/moveTo";
import { resetCreep } from "Selectors/resetCreep";

export class UpgradeEngineerObjective extends Objective {
    minionTypes = [MinionTypes.ENGINEER];

    action = (creep: Creep) => {
        if (!creep.memory.state) {
            setState(States.GET_ENERGY)(creep);
        } else if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
            resetCreep(creep); // Free creep for another task
            return;
        }
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            setState(States.WORKING)(creep);
        }
        if (creep.memory.state === States.GET_ENERGY) {
            if (engineerGetEnergy(creep) === BehaviorResult.SUCCESS) {
                setState(States.WORKING)(creep);
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

