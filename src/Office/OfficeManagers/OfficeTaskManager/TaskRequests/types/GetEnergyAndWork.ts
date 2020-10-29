import { TaskAction, TaskActionResult } from "../TaskAction";

import { CachedCreep } from "WorldState/branches/WorldMyCreeps";
import { getEnergy } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/GetEnergy";

enum WorkStates {
    GETTING_ENERGY = 'GETTING_ENERGY',
    WORKING = 'WORKING'
}

export class GetEnergyAndWorkTask extends TaskAction {
    state: WorkStates = WorkStates.WORKING;

    work(creep: CachedCreep): TaskActionResult { return TaskActionResult.FAILED; }

    action(creep: CachedCreep): TaskActionResult {
        if (!this.valid()) return TaskActionResult.FAILED;

        switch (this.state) {
            case WorkStates.WORKING: {
                if (creep.capacityUsed === 0) {
                    this.state = WorkStates.GETTING_ENERGY;
                    return this.action(creep); // Switch to getting energy
                }

                return this.work(creep);
            }
            case WorkStates.GETTING_ENERGY: {
                if (creep.capacityUsed > 0) {
                    this.state = WorkStates.WORKING;
                    return this.action(creep); // Switch to building
                }
                return (getEnergy(creep) === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED
            }
        }
    }

    canBeFulfilledBy(creep: CachedCreep) {
        return creep.gameObj.getActiveBodyparts(WORK) > 0 && creep.gameObj.getActiveBodyparts(CARRY) > 0 && creep.gameObj.getActiveBodyparts(MOVE) > 0
    }
}
