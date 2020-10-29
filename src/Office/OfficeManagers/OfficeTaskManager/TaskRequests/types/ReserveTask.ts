import { TaskAction, TaskActionResult } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";

import { CachedController } from "WorldState";
import { CachedCreep } from "WorldState/branches/WorldCreeps";
import { travel } from "../activity/Travel";

export class ReserveTask extends TaskAction {
    message = "⏫";

    constructor(
        public destination: CachedController,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[UpgradeTask: ${this.destination.pos.roomName}{${this.destination.pos.x},${this.destination.pos.y}}]`
    }

    valid() {
        // If we can see the controller and it's blocked for more than 200 ticks,
        // abort this task
        return !(
            this.destination.gameObj &&
            this.destination.gameObj.upgradeBlocked !== undefined &&
            this.destination.gameObj.upgradeBlocked > 200
        )
    }

    canBeFulfilledBy(creep: CachedCreep) {
        return creep.gameObj.getActiveBodyparts(CLAIM) > 0;
    }

    action(creep: CachedCreep): TaskActionResult {
        if (creep.pos.roomName !== this.destination.pos.roomName) {
            travel(creep, this.destination.pos);
            return TaskActionResult.INPROGRESS;
        }
        // We are now in the room
        if (!this.destination.gameObj) { return TaskActionResult.FAILED; }

        if ((
                this.destination.owner !== undefined &&
                this.destination.owner !== 'LordGreywether'
            ) || (
                this.destination.reservationOwner !== undefined &&
                this.destination.reservationOwner !== 'LordGreywether'
        )) {
            // Must attack the controller before we can claim it
            let result = creep.gameObj.attackController(this.destination.gameObj);
            if (this.destination.gameObj.sign?.username !== 'LordGreywether') {
                result = creep.gameObj.signController(this.destination.gameObj, 'This sector property of the Grey Company')
            }
            if (result === ERR_NOT_IN_RANGE) {
                travel(creep, this.destination.pos);
            }
            return TaskActionResult.INPROGRESS;
        } else {
            let result = creep.gameObj.reserveController(this.destination.gameObj);
            if (this.destination.gameObj.sign?.username !== 'LordGreywether') {
                result = creep.gameObj.signController(this.destination.gameObj, 'This sector property of the Grey Company')
            }
            if (result === ERR_NOT_IN_RANGE) {
                travel(creep, this.destination.pos);
            }
            return TaskActionResult.INPROGRESS;
        }
    }
}
