import { GrafanaAnalyst } from "Boardroom/BoardroomManagers/GrafanaAnalyst";
import { Transform, TransformationType, Type } from "class-transformer";
import { assert } from "console";
import { MustHaveWorkParts } from "TaskRequests/prereqs/MustHaveWorkParts";
import { transformGameObject } from "utils/transformGameObject";
import { MustBeAdjacent } from "../prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "../prereqs/MustHaveEnergy";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction, TaskActionResult } from "../TaskAction";

export class RepairTask extends TaskAction {
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
            new MustHaveEnergy((this.destination.hitsMax - this.destination.hits)/100),
            new MustBeAdjacent(this.destination.pos, 3),
        ]
    }
    message = "🛠";

    @Type(() => Structure)
    @Transform(transformGameObject(Structure))
    destination: Structure|null = null

    constructor(
        destination: Structure|null = null,
    ) {
        super();
        this.destination = destination;
    }
    toString() {
        return `[RepairTask: ${this.destination?.id} {${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination) return TaskActionResult.FAILED;
        let grafanaAnalyst = global.boardroom.managers.get('GrafanaAnalyst') as GrafanaAnalyst;

        let result = creep.repair(this.destination);
        if (result === ERR_NOT_ENOUGH_ENERGY) {
            TaskActionResult.SUCCESS;
        } else if (result !== OK){
            return TaskActionResult.FAILED;
        }
        grafanaAnalyst.reportRepair(creep.memory.office||'', Math.max(1 * creep.getActiveBodyparts(WORK), creep.store.energy))
        return (this.destination.hits === this.destination.hitsMax) ? TaskActionResult.SUCCESS : TaskActionResult.INPROGRESS;
    }
    /**
     * Calculates cost based on the effectiveness of the minion
     * @param minion
     */
    cost(minion: SpeculativeMinion) {
        return minion.capacity/(minion.creep.getActiveBodyparts(WORK) * 5)
    }
    predict(minion: SpeculativeMinion) {
        let targetCapacity = ((this.destination as Structure).hitsMax - (this.destination as Structure).hits)/100;
        return {
            ...minion,
            output: Math.min(minion.capacityUsed, targetCapacity),
            capacityUsed: Math.max(0, minion.capacityUsed - targetCapacity)
        }
    }
    valid() {
        return !!this.destination && this.destination.hits < this.destination.hitsMax;
    }
}
