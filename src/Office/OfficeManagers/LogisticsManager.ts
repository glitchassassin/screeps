import { HRAnalyst } from "Boardroom/BoardroomManagers/HRAnalyst";
import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";
import { table } from "table";
import { TaskRequest } from "TaskRequests/TaskRequest";
import { DepotTask } from "TaskRequests/types/DepotTask";
import { TransferTask } from "TaskRequests/types/TransferTask";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";
import { Bar, Meters } from "Visualizations/Meters";
import { Table } from "Visualizations/Table";

export class LogisticsManager extends OfficeManager {
    storage: StructureStorage[] = [];
    extensions: StructureExtension[] = [];
    spawns: StructureSpawn[] = [];
    carriers: Creep[] = [];
    plan() {
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;

        this.storage = logisticsAnalyst.getStorage(this.office)
        this.extensions = hrAnalyst.getExtensions(this.office)
        this.carriers = logisticsAnalyst.getCarriers(this.office)
        this.spawns = hrAnalyst.getSpawns(this.office)

        switch (this.status) {
            case OfficeManagerStatus.OFFLINE: {
                // Manager is offline, do nothing
                return;
            }
            case OfficeManagerStatus.MINIMAL: {
                // Maintain one carrier
                if (this.carriers.length === 0) {
                    this.office.submit(new MinionRequest(`${this.office.name}_Logistics`, 6, MinionTypes.CARRIER));
                }
            }
            default: {
                // Maintain enough carriers to keep
                // franchises drained
                let metrics = statisticsAnalyst.metrics.get(this.office.name);
                let inputAverageMean = metrics?.mineContainerLevels.asPercentMean() || 0;
                if (this.carriers.length === 0) {
                    this.office.submit(new MinionRequest(`${this.office.name}_Logistics`, 6, MinionTypes.CARRIER));
                } else if (Game.time % 50 === 0 && inputAverageMean > 0.1) {
                    console.log(`Franchise surplus of ${(inputAverageMean * 100).toFixed(2)}% detected, spawning carrier`);
                    this.office.submit(new MinionRequest(`${this.office.name}_Logistics`, 6, MinionTypes.CARRIER));
                }
            }
        }

        // Create standing order for storage, or else stockpile near spawn
        if (this.storage.length > 0) {
            this.storage.forEach(c => {
                let e = getTransferEnergyRemaining(c);
                if (e && e > 0) {
                    // Use a TransferTask instead of a TransferTask to only get energy from a source container.
                    // Avoids shuffling back and forth between destination containers
                    this.office.submit(new TaskRequest(c.id, new TransferTask(c), 2, e));
                }
            })
        } else {
            // this.office.submit(new TaskRequest(this.office.name + '_Logistics_Surplus', new DepotTask(this.spawns[0].pos, 1), 2, 1000));
        }
    }
    run() {
        if (global.v.logistics.state) {
            this.report();
        }
    }
    report() {
        // Franchise energy level (current and average)
        // Storage level (current)
        // Room energy level (current and average)
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
        let metrics = statisticsAnalyst.metrics.get(this.office.name);

        let lastMineContainerLevel = metrics?.mineContainerLevels.values[metrics?.mineContainerLevels.values.length - 1] || 0
        let lastRoomEnergyLevel = metrics?.roomEnergyLevels.values[metrics?.roomEnergyLevels.values.length - 1] || 0
        let lastStorageLevel = metrics?.storageLevels.values[metrics?.storageLevels.values.length - 1] || 0
        let lastControllerDepotLevel = metrics?.controllerDepotLevels.values[metrics?.controllerDepotLevels.values.length - 1] || 0

        let chart = new Meters([
            new Bar('Franchises', {fill: 'yellow', stroke: 'yellow'}, lastMineContainerLevel, metrics?.mineContainerLevels.maxValue),
            new Bar('HR', {fill: 'magenta', stroke: 'magenta'}, lastRoomEnergyLevel, metrics?.roomEnergyLevels.maxValue),
            new Bar('Storage', {fill: 'green', stroke: 'green'}, lastStorageLevel, metrics?.storageLevels.maxValue),
            new Bar('Legal', {fill: 'blue', stroke: 'blue'}, lastControllerDepotLevel, metrics?.controllerDepotLevels.maxValue),
        ])

        chart.render(new RoomPosition(2, 2, this.office.center.name));
    }
}
