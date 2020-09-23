import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { table } from "table";
import { TaskRequest } from "tasks/TaskRequest";
import { ResupplyTask } from "tasks/types/ResupplyTask";
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
            global.supervisors[room.name].spawn.submit(new MinionRequest(`${room.name}_Logistics`, 7, MinionTypes.HAULER));
        }

        // Request energy, if needed
        this.containers.forEach(c => {
            let e = getTransferEnergyRemaining(c);
            if (e && !global.analysts.source.isMineContainer(c) && e > 0) {
                // Use a ResupplyTask instead of a TransferTask to only get energy from a source container.
                // Avoids shuffling back and forth between destination containers
                global.supervisors[room.name].task.submit(new TaskRequest(c.id, new ResupplyTask(c), 5, e));
            }
        })
        this.extensions.forEach(e => {
            let energy = getTransferEnergyRemaining(e);
            if (energy && energy > 0) {
                global.supervisors[room.name].task.submit(new TaskRequest(e.id, new TransferTask(e), 5, energy));
            }
        })
        this.spawns.forEach((spawn) => {
            let roomCapacity = room.energyAvailable
            let spawnCapacity = getTransferEnergyRemaining(spawn);
            if (!spawnCapacity) return;
            if (roomCapacity < 200) {
                global.supervisors[room.name].task.submit(new TaskRequest(spawn.id, new TransferTask(spawn), 10, spawnCapacity));
            } else if (spawnCapacity > 0) {
                global.supervisors[room.name].task.submit(new TaskRequest(spawn.id, new TransferTask(spawn), 5, spawnCapacity));
            }
        })
    }
    report() {
        const containerTable = [['Container', 'Quantity', 'Health']];
        containerTable.push(
            ...this.containers.map(container => {
                return [
                    container.toString() || '',
                    `${container.store.getUsedCapacity()}/${container.store.getCapacity()}`,
                    `${container.hits}/${container.hitsMax}`
                ];
            })
        )
        const containerTableRendered = table(containerTable, {
            singleLine: true
        });


        console.log(`[LogisticsManager] Status Report:
    <strong>Containers</strong>
${containerTableRendered}`
        )
    }
}
