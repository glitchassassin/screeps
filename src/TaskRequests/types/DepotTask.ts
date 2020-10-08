import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";

export class DepotTask extends TaskAction {
    message = "⏩";

    timeout?: number;

    constructor(
        public destination: RoomPosition,
        public amount: number
    ) {
        super();
    }
    toString() {
        return `[DepotTask: ${this.destination.roomName}{${this.destination.x},${this.destination.y}}]`
    }

    action(creep: Creep) {
        // Wait for minions to request resources
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        if (creep.store.getUsedCapacity() > 0) {
            logisticsAnalyst.reportDepot(creep);
            return TaskActionResult.INPROGRESS;
        }
        return TaskActionResult.SUCCESS;
    }
}
