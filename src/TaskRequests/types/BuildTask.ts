import { CachedConstructionSite } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { getEnergy } from "TaskRequests/activity/GetEnergy";
import { travel } from "TaskRequests/activity/Travel";
import { MustHaveWorkParts } from "TaskRequests/prereqs/MustHaveWorkParts";
import { log } from "utils/logger";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction, TaskActionResult } from "../TaskAction";

enum BuildStates {
    GETTING_ENERGY = 'GETTING_ENERGY',
    BUILDING = 'BUILDING'
}

export class BuildTask extends TaskAction {
    getPrereqs() {
        if (!this.destination) return [];
        return [
            new MustHaveWorkParts()
        ]
    }
    message = "🔨";
    state: BuildStates = BuildStates.BUILDING;

    source: string|null = null;

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

    action(creep: Creep): TaskActionResult {
        // If unable to get the creep or source, task is completed
        if (!this.destination || !this.destination.gameObj) return TaskActionResult.SUCCESS;

        switch (this.state) {
            case BuildStates.BUILDING: {
                if (creep.store.getUsedCapacity() === 0) {
                    this.state = BuildStates.GETTING_ENERGY;
                    return this.action(creep); // Switch to getting energy
                }

                // If out of the room, travel there
                if (creep.pos.roomName !== this.destination.pos.roomName) {
                    return (travel(creep, this.destination.pos, 3) === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED
                }

                let result = creep.build(this.destination.gameObj);
                if (result === ERR_NOT_IN_RANGE) {
                    return (travel(creep, this.destination.pos, 3) === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED
                } else if (result !== OK) {
                    log('BuildTask', `build: ${result}`)
                    return TaskActionResult.FAILED;
                }

                return TaskActionResult.INPROGRESS;
            }
            case BuildStates.GETTING_ENERGY: {
                if (creep.store.getUsedCapacity() > 0) {
                    this.state = BuildStates.BUILDING;
                    return this.action(creep); // Switch to building
                }
                return (getEnergy(creep) === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED
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
        return !!this.destination;
    }
}
