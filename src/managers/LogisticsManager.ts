import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
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
    }
}
