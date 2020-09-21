import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { TaskRequest } from "tasks/TaskRequest";
import { TransferTask } from "tasks/types/TransferTask";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";
import { Manager } from "./Manager";

export class LogisticsManager extends Manager {
    containers: StructureContainer[] = [];
    extensions: StructureExtension[] = [];
    spawns: StructureSpawn[] = [];
    haulers: Creep[] = [];
    init = (room: Room) => {
        this.containers = global.analysts.logistics.getContainers(room)
        this.extensions = global.analysts.spawn.getExtensions(room)
        this.haulers = global.analysts.logistics.getHaulers(room)
        this.spawns = global.analysts.spawn.getSpawns(room).map(s => s.spawn)

        // Request minions, if needed
        if (this.haulers.length < this.containers.length) {
            global.supervisors.spawn.submit(new MinionRequest(`${room.name}_Logistics`, 5, MinionTypes.HAULER));
        }

        // Request energy, if needed
        this.containers.forEach(c => {
            let e = getTransferEnergyRemaining(c);
            if (!global.analysts.source.isMineContainer(c) && e > 0) {
                global.supervisors.task.submit(new TaskRequest(c.id, new TransferTask(c), 5, e));
            }
        })
        this.extensions.forEach(e => {
            let energy = getTransferEnergyRemaining(e);
            if (energy > 0) {
                global.supervisors.task.submit(new TaskRequest(e.id, new TransferTask(e), 5, energy));
            }
        })
        this.spawns.forEach((spawn) => {
            let roomCapacity = room.energyAvailable
            let spawnCapacity = getTransferEnergyRemaining(spawn);
            if (roomCapacity < 200) {
                global.supervisors.task.submit(new TaskRequest(spawn.id, new TransferTask(spawn), 10, spawnCapacity));
            } else if (spawnCapacity > 0) {
                global.supervisors.task.submit(new TaskRequest(spawn.id, new TransferTask(spawn), 5, spawnCapacity));
            }
        })
    }
}
