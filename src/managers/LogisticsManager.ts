import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { TaskRequest } from "tasks/TaskRequest";
import { TransferTask } from "tasks/types/TransferTask";
import { Manager } from "./Manager";

export class LogisticsManager extends Manager {
    containers: StructureContainer[] = [];
    haulers: Creep[] = [];
    init = (room: Room) => {
        this.containers = global.analysts.logistics.getContainers(room)
        this.haulers = global.analysts.logistics.getHaulers(room)

        // Request minions, if needed
        if (this.haulers.length < this.containers.length) {
            global.managers.spawn.submit(new MinionRequest(`${room.name}_Logistics`, 5, MinionTypes.HAULER));
        }

        // Request energy, if needed
        this.containers.forEach(c => {
            if (!global.analysts.source.isMineContainer(c) && c.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                global.managers.task.submit(new TaskRequest(c.id, new TransferTask(c)));
            }
        })
    }
}
