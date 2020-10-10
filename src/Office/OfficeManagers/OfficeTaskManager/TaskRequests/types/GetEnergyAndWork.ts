import { getEnergy } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/activity/GetEnergy";
import { TaskAction, TaskActionResult } from "../TaskAction";

enum WorkStates {
    GETTING_ENERGY = 'GETTING_ENERGY',
    WORKING = 'WORKING'
}

export class GetEnergyAndWorkTask extends TaskAction {
    state: WorkStates = WorkStates.WORKING;

    work(creep: Creep): TaskActionResult { return TaskActionResult.FAILED; }

    action(creep: Creep): TaskActionResult {
        if (!this.valid()) return TaskActionResult.FAILED;

        switch (this.state) {
            case WorkStates.WORKING: {
                if (creep.store.getUsedCapacity() === 0) {
                    this.state = WorkStates.GETTING_ENERGY;
                    return this.action(creep); // Switch to getting energy
                }

                return this.work(creep);
            }
            case WorkStates.GETTING_ENERGY: {
                if (creep.store.getUsedCapacity() > 0) {
                    this.state = WorkStates.WORKING;
                    return this.action(creep); // Switch to building
                }
                return (getEnergy(creep) === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED
            }
        }
    }

    canBeFulfilledBy(creep: Creep) {
        return creep.getActiveBodyparts(WORK) > 0 && creep.getActiveBodyparts(CARRY) > 0 && creep.getActiveBodyparts(MOVE) > 0
    }
}
