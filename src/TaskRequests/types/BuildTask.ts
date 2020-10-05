import { CachedConstructionSite } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { GrafanaAnalyst } from "Boardroom/BoardroomManagers/GrafanaAnalyst";
import { TaskManager } from "Office/OfficeManagers/TaskManager";
import { MustHaveWorkParts } from "TaskRequests/prereqs/MustHaveWorkParts";
import { TaskRequest } from "TaskRequests/TaskRequest";
import { MustBeAdjacent } from "../prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "../prereqs/MustHaveEnergy";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction, TaskActionResult } from "../TaskAction";
import { TransferTask } from "./TransferTask";

export class BuildTask extends TaskAction {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the destination
    // Prereq: Minion must have enough energy
    //         to fill target
    //         Otherwise, get some by harvesting
    //         or withdrawing
    getPrereqs() {
        if (!this.destination) return [];
        return [
            new MustHaveWorkParts(),
            new MustHaveEnergy(this.destination.progressTotal - this.destination.progress),
            new MustBeAdjacent(this.destination.pos, 3),
        ]
    }
    message = "🔨";

    destination: CachedConstructionSite|null = null

    constructor(
        destination: CachedConstructionSite|null = null,
    ) {
        super();
        this.destination = destination;
    }
    toString() {
        return `[BuildTask: ${this.destination?.pos.roomName}{${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination || !this.destination.gameObj) return TaskActionResult.FAILED;
        let grafanaAnalyst = global.boardroom.managers.get('GrafanaAnalyst') as GrafanaAnalyst;
        let office = creep.memory.office ? global.boardroom.offices.get(creep.memory.office) : undefined
        let taskManager = office?.managers.get('TaskManager') as TaskManager;

        let result = creep.build(this.destination.gameObj);
        if (result === ERR_NOT_ENOUGH_ENERGY) {
            return TaskActionResult.SUCCESS;
        } else if (result !== OK){
            return TaskActionResult.FAILED;
        }
        grafanaAnalyst.reportBuild(creep.memory.office||'', Math.max(5 * creep.getActiveBodyparts(WORK), creep.store.energy))
        return TaskActionResult.INPROGRESS;
    }
    /**
     * Calculates cost based on the effectiveness of the minion
     * @param minion
     */
    cost(minion: SpeculativeMinion) {
        return minion.capacity/(minion.creep.getActiveBodyparts(WORK) * 5)
    }
    predict(minion: SpeculativeMinion) {
        let targetCapacity = (this.destination as CachedConstructionSite).progressTotal - (this.destination as CachedConstructionSite).progress;
        return {
            ...minion,
            output: Math.min(minion.capacityUsed, targetCapacity),
            capacityUsed: Math.max(0, minion.capacityUsed - targetCapacity)
        }
    }
    valid() {
        return !!this.destination;
    }
}
