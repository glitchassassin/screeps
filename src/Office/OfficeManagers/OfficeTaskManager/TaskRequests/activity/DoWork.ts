import { TaskActionResult } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/TaskAction";
import { travel } from "./Travel";

export const doWork = (creep: Creep, destination: RoomPosition, callback: (creep: Creep) => ScreepsReturnCode) => {
    // If out of the room, travel there
    if (creep.pos.roomName !== destination.roomName) {
        return (travel(creep, destination, 3) === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED
    }

    let result = callback(creep)
    if (result === ERR_NOT_IN_RANGE) {
        return (travel(creep, destination, 3) === OK) ? TaskActionResult.INPROGRESS : TaskActionResult.FAILED
    } else if (result !== OK) {
        return TaskActionResult.FAILED;
    }

    return TaskActionResult.INPROGRESS;
}
