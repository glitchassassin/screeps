import { CachedConstructionSite } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { GrafanaAnalyst } from "Boardroom/BoardroomManagers/GrafanaAnalyst";
import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { getEnergy } from "TaskRequests/activity/GetEnergy";
import { travel } from "TaskRequests/activity/Travel";
import { withdraw } from "TaskRequests/activity/Withdraw";
import { MustHaveWorkParts } from "TaskRequests/prereqs/MustHaveWorkParts";
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

                let result = creep.build(this.destination.gameObj);
                if (result === ERR_NOT_IN_RANGE) {
                    let result = travel(creep, this.destination.pos, 3);
                    return (result === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED
                } else if (result !== OK) {
                    return TaskActionResult.FAILED;
                }

                // Report successful build action
                let grafanaAnalyst = global.boardroom.managers.get('GrafanaAnalyst') as GrafanaAnalyst;
                grafanaAnalyst.reportBuild(creep.memory.office||'', Math.max(5 * creep.getActiveBodyparts(WORK), creep.store.energy))
                return TaskActionResult.INPROGRESS;
            }
            case BuildStates.GETTING_ENERGY: {
                if (creep.store.getUsedCapacity() > 0) {
                    this.state = BuildStates.BUILDING;
                    return this.action(creep); // Switch to building
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
        return !!this.destination;
    }
}
