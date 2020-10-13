import { TaskAction, TaskActionResult } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";
import { TerritoryIntelligence } from "Office/RoomIntelligence";
import { travel } from "../activity/Travel";

export class ReserveTask extends TaskAction {
    message = "⏫";

    constructor(
        public destination: TerritoryIntelligence,
        public priority: number
    ) {
        super(priority);
    }
    toString() {
        return `[UpgradeTask: ${this.destination.controller.pos?.roomName}{${this.destination.controller.pos?.x},${this.destination.controller.pos?.y}}]`
    }

    canBeFulfilledBy(creep: Creep) {
        return creep.getActiveBodyparts(CLAIM) > 0;
    }

    action(creep: Creep): TaskActionResult {
        if (!this.destination.scanned) {
            travel(creep, new RoomPosition(25, 25, this.destination.name));
            return TaskActionResult.INPROGRESS;
        } else if (!this.destination.controller.pos || this.destination.controller.my) {
            // Room scanned, no controller
            return TaskActionResult.FAILED;
        } else if (creep.pos.roomName !== this.destination.name) {
            travel(creep, new RoomPosition(
                this.destination.controller.pos.x,
                this.destination.controller.pos.y,
                this.destination.controller.pos.roomName
            ));
            return TaskActionResult.INPROGRESS;
        }


        // We are now in the room
        if (!creep.room.controller) { return TaskActionResult.FAILED; }

        if (
            creep.room.controller?.owner?.username !== undefined ||
            creep.room.controller?.reservation?.username !== undefined
        ) {
            // Must attack the controller before we can claim it
            let result = creep.attackController(creep.room.controller);
            if (result === ERR_NOT_IN_RANGE) {
                travel(creep, creep.room.controller.pos);
            }
            return TaskActionResult.INPROGRESS;
        } else {
            let result = creep.reserveController(creep.room.controller);
            if (result === ERR_NOT_IN_RANGE) {
                travel(creep, creep.room.controller.pos);
            }
            return TaskActionResult.INPROGRESS;
        }
    }
}
