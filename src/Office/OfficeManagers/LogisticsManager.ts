import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";
import { table } from "table";
import { TaskRequest } from "tasks/TaskRequest";
import { ResupplyTask } from "tasks/types/ResupplyTask";
import { TransferTask } from "tasks/types/TransferTask";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";

export class LogisticsManager extends OfficeManager {
    storage: StructureStorage[] = [];
    containers: StructureContainer[] = [];
    extensions: StructureExtension[] = [];
    spawns: StructureSpawn[] = [];
    haulers: Creep[] = [];
    plan() {
        this.storage = global.analysts.logistics.getStorage(this.office)
        this.extensions = global.analysts.spawn.getExtensions(this.office)
        this.haulers = global.analysts.logistics.getHaulers(this.office)
        this.spawns = global.analysts.spawn.getSpawns(this.office)

        switch (this.status) {
            case OfficeManagerStatus.OFFLINE: {
                // Manager is offline, do nothing
                return;
            }
            case OfficeManagerStatus.MINIMAL: {
                // Maintain one hauler
                if (this.haulers.length === 0) {
                    this.office.submit(new MinionRequest(`${this.office.name}_Logistics`, 7, MinionTypes.HAULER));
                }
            }
            default: {
                // Maintain enough haulers to keep
                // franchises drained
                let outputAverageLevel = global.analysts.statistics.metrics[this.office.name].outputContainerLevels.mean();
                let inputAverageLevel = global.analysts.statistics.metrics[this.office.name].mineContainerLevels.mean();
                let inputAverageMean = global.analysts.statistics.metrics[this.office.name].mineContainerLevels.asPercent.mean();
                if (this.haulers.length === 0) {
                    this.office.submit(new MinionRequest(`${this.office.name}_Logistics`, 7, MinionTypes.HAULER));
                } else if (Game.time % 50 === 0 && inputAverageMean > 0.1 && outputAverageLevel < inputAverageLevel) {
                    console.log('Franchise surplus detected, spawning hauler');
                    this.office.submit(new MinionRequest(`${this.office.name}_Logistics`, 7, MinionTypes.HAULER));
                }
            }
        }

        // Request energy, if needed
        this.storage.forEach(c => {
            let e = getTransferEnergyRemaining(c);
            if (e && e > 0) {
                // Use a ResupplyTask instead of a TransferTask to only get energy from a source container.
                // Avoids shuffling back and forth between destination containers
                this.office.submit(new TaskRequest(c.id, new ResupplyTask(c), 2, e));
            }
        })
        this.extensions.forEach(e => {
            let energy = getTransferEnergyRemaining(e);
            if (energy && energy > 0) {
                this.office.submit(new TaskRequest(e.id, new ResupplyTask(e), 6, energy));
            }
        })
        this.spawns.forEach((spawn) => {
            let roomCapacity = spawn.room.energyAvailable
            let spawnCapacity = getTransferEnergyRemaining(spawn);
            if (!spawnCapacity) return;
            if (roomCapacity < 200) {
                this.office.submit(new TaskRequest(spawn.id, new TransferTask(spawn), 10, spawnCapacity));
            } else if (spawnCapacity > 0) {
                this.office.submit(new TaskRequest(spawn.id, new ResupplyTask(spawn), 6, spawnCapacity));
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
