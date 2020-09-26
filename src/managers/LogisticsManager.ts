import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { table } from "table";
import { TaskRequest } from "tasks/TaskRequest";
import { ResupplyTask } from "tasks/types/ResupplyTask";
import { TransferTask } from "tasks/types/TransferTask";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";
import { Manager } from "./Manager";

export class LogisticsManager extends Manager {
    storage: StructureStorage[] = [];
    containers: StructureContainer[] = [];
    extensions: StructureExtension[] = [];
    spawns: StructureSpawn[] = [];
    haulers: Creep[] = [];
    init = (room: Room) => {
        this.storage = global.analysts.logistics.getStorage(room)
        this.containers = global.analysts.logistics.getContainers(room)
        this.extensions = global.analysts.spawn.getExtensions(room)
        this.haulers = global.analysts.logistics.getHaulers(room)
        this.spawns = global.analysts.spawn.getSpawns(room)

        let miners = global.analysts.source.getMiners(room);
        let sources = global.analysts.source.getSources(room);

        // Request minions, if needed
        if (this.haulers.length < Math.min(miners.length, sources.length)) {
            global.supervisors[room.name].spawn.submit(new MinionRequest(`${room.name}_Logistics`, 7, MinionTypes.HAULER));
        } else {
            let outputAverageLevel = global.analysts.statistics.metrics[room.name].outputContainerLevels.mean();
            let inputAverageLevel = global.analysts.statistics.metrics[room.name].mineContainerLevels.mean();
            let inputAverageMean = global.analysts.statistics.metrics[room.name].mineContainerLevels.asPercent.mean();
            // Check periodically if we have surplus in the mine containers that isn't being shifted to the output containers
            if (Game.time % 50 === 0 && inputAverageMean > 0.1 && outputAverageLevel < inputAverageLevel) {
                // If so, spawn more haulers to move the surplus
                console.log('Mine surplus detected, spawning hauler');
                global.supervisors[room.name].spawn.submit(new MinionRequest(`${room.name}_Logistics`, 7, MinionTypes.HAULER));
            }
        }

        // Request energy, if needed
        let controllerDepot = global.analysts.controller.getDesignatedUpgradingLocations(room)
        this.storage.forEach(c => {
            let e = getTransferEnergyRemaining(c);
            if (e && e > 0) {
                // Use a ResupplyTask instead of a TransferTask to only get energy from a source container.
                // Avoids shuffling back and forth between destination containers
                global.supervisors[room.name].task.submit(new TaskRequest(c.id, new ResupplyTask(c), 2, e));
            }
        })
        this.containers.forEach(c => {
            let e = getTransferEnergyRemaining(c);
            if (e && !global.analysts.source.isMineContainer(c) && e > 0) {
                // Use a ResupplyTask instead of a TransferTask to only get energy from a source container.
                // Avoids shuffling back and forth between destination containers
                if (c === controllerDepot?.container) {
                    // Controller depot gets refilled after everything else is topped up
                    global.supervisors[room.name].task.submit(new TaskRequest(c.id, new ResupplyTask(c), 2, e));
                } else {
                    global.supervisors[room.name].task.submit(new TaskRequest(c.id, new ResupplyTask(c), 5, e));
                }
            }
        })
        this.extensions.forEach(e => {
            let energy = getTransferEnergyRemaining(e);
            if (energy && energy > 0) {
                global.supervisors[room.name].task.submit(new TaskRequest(e.id, new ResupplyTask(e), 6, energy));
            }
        })
        this.spawns.forEach((spawn) => {
            let roomCapacity = room.energyAvailable
            let spawnCapacity = getTransferEnergyRemaining(spawn);
            if (!spawnCapacity) return;
            if (roomCapacity < 200) {
                global.supervisors[room.name].task.submit(new TaskRequest(spawn.id, new TransferTask(spawn), 10, spawnCapacity));
            } else if (spawnCapacity > 0) {
                global.supervisors[room.name].task.submit(new TaskRequest(spawn.id, new ResupplyTask(spawn), 6, spawnCapacity));
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
