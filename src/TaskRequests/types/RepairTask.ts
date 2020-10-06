import { GrafanaAnalyst } from "Boardroom/BoardroomManagers/GrafanaAnalyst";
import { Exclude, Transform, TransformationType, Type } from "class-transformer";
import { assert } from "console";
import { getEnergy } from "TaskRequests/activity/GetEnergy";
import { travel } from "TaskRequests/activity/Travel";
import { MustHaveWorkParts } from "TaskRequests/prereqs/MustHaveWorkParts";
import { transformGameObject } from "utils/transformGameObject";
import { MustBeAdjacent } from "../prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "../prereqs/MustHaveEnergy";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction, TaskActionResult } from "../TaskAction";

enum RepairStates {
    GETTING_ENERGY = 'GETTING_ENERGY',
    REPAIRING = 'REPAIRING'
}

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
            new MustHaveWorkParts()
        ]
    }
    message = "🛠";
    state = RepairStates.GETTING_ENERGY;
    destinationId: Id<Structure>|null = null

    @Exclude()
    public get destination() : Structure|null {
        return this.destinationId && Game.getObjectById(this.destinationId)
    }

    constructor(
        destination: Structure|null = null,
    ) {
        super();
        this.destinationId = destination?.id || null;
    }
    toString() {
        return `[RepairTask: ${this.destination?.pos.roomName}{${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    action(creep: Creep): TaskActionResult {
        // If unable to get the creep or source, task is completed
        if (!this.destination) return TaskActionResult.FAILED;

        switch (this.state) {
            case RepairStates.REPAIRING: {
                if (creep.store.getUsedCapacity() === 0) {
                    this.state = RepairStates.GETTING_ENERGY;
                    return this.action(creep); // Switch to getting energy
                }

                let result = creep.repair(this.destination);
                if (result === ERR_NOT_IN_RANGE) {
                    let result = travel(creep, this.destination.pos, 3);
                    return (result === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED
                }
                else if (result !== OK) {
                    return TaskActionResult.FAILED;
                }

                // Report successful build action
                let grafanaAnalyst = global.boardroom.managers.get('GrafanaAnalyst') as GrafanaAnalyst;
                grafanaAnalyst.reportRepair(creep.memory.office||'', Math.max(1 * creep.getActiveBodyparts(WORK), creep.store.energy))

                return (this.destination.hits === this.destination.hitsMax) ? TaskActionResult.SUCCESS : TaskActionResult.INPROGRESS;
            }
            case RepairStates.GETTING_ENERGY: {
                if (creep.store.getUsedCapacity() > 0) {
                    this.state = RepairStates.REPAIRING;
                    return this.action(creep); // Switch to repairing
                }
                let result = getEnergy(creep);
                return (result === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED
            }
        }
    }
    /**
     * Calculates cost based on the effectiveness of the minion
     * @param minion
     */
    cost(minion: SpeculativeMinion) {
        return minion.capacity/(minion.creep.getActiveBodyparts(WORK) * 5)
    }
    predict(minion: SpeculativeMinion) {
        return {
            ...minion,
            output: minion.capacity,
            capacityUsed: minion.capacity
        }
    }
    valid() {
        return !!this.destination && this.destination.hits < this.destination.hitsMax;
    }
}
