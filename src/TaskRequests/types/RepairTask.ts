import { GrafanaAnalyst } from "Boardroom/BoardroomManagers/GrafanaAnalyst";
import { getEnergy } from "TaskRequests/activity/GetEnergy";
import { travel } from "TaskRequests/activity/Travel";
import { MustHaveWorkParts } from "TaskRequests/prereqs/MustHaveWorkParts";
import { log } from "utils/logger";
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
    pos?: RoomPosition;
    id?: Id<Structure>;

    public get destination() : Structure|null {
        if ((!this.pos || !this.id) || this.pos && !Game.rooms[this.pos.roomName]) {
            return null // Room not visible, or pos/id not set
        }
        return Game.getObjectById(this.id);
    }

    constructor(
        destination?: Structure,
    ) {
        super();
        this.pos = destination?.pos;
        this.id = destination?.id;
    }
    toString() {
        return `[RepairTask: ${this.pos?.roomName}{${this.pos?.x},${this.pos?.y}}]`
    }

    action(creep: Creep): TaskActionResult {
        // If unable to get the destination position, task is canceled
        if (!this.pos) return TaskActionResult.FAILED;

        switch (this.state) {
            case RepairStates.REPAIRING: {
                if (creep.store.getUsedCapacity() === 0) {
                    this.state = RepairStates.GETTING_ENERGY;
                    return this.action(creep); // Switch to getting energy
                }

                // If out of the room, travel there
                if (creep.pos.roomName !== this.pos.roomName) {
                    let result = travel(creep, this.pos, 3);
                    if (result !== OK) log('RepairTask', `travel to room: ${result}`);
                    return (result === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED
                }

                // If we are in the room, but can't find the destination, task is canceled
                if (!this.destination) return TaskActionResult.FAILED;

                let result = creep.repair(this.destination);
                if (result === ERR_NOT_IN_RANGE) {
                    let result = travel(creep, this.pos, 3);
                    if (result !== OK) log('RepairTask', `travel: ${result}`);
                    return (result === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED
                }
                else if (result !== OK) {
                    log('RepairTask', `repair: ${result}`);
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
                if (result !== OK) log('RepairTask', `getEnergy: ${result}`);
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
        log('RepairTask', `valid? ${this.pos}, ${this.destination}, ${this.destination?.hits} ${this.destination?.hitsMax}`)
        return !!(this.destination ? this.destination.hits < this.destination.hitsMax : this.pos);
    }
}
