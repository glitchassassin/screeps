import { Boardroom } from "Boardroom/Boardroom";
import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Office } from "Office/Office";
import { TaskManager } from "Office/OfficeManagers/TaskManager";
import { ControllerAnalyst } from "./ControllerAnalyst";
import { LogisticsAnalyst } from "./LogisticsAnalyst";
import { SalesAnalyst } from "./SalesAnalyst";


export class GrafanaAnalyst extends BoardroomManager {
    deltas: {
        [id: string]: {
            building: number,
            repairing: number,
            healing: number,
            attacking: number,
        }
    } = {};
    plan() {
        this.boardroom.offices.forEach(office => {
            this.deltas[office.name] = {
                building: 0,
                repairing: 0,
                healing: 0,
                attacking: 0,
            }
        });
    }
    reportBuild(officeName: string, delta: number) {
        this.deltas[officeName].building += delta;
    }
    reportRepair(officeName: string, delta: number) {
        this.deltas[officeName].repairing += delta;
    }
    reportHeal(officeName: string, delta: number) {
        this.deltas[officeName].healing += delta;
    }
    reportAttack(officeName: string, delta: number) {
        this.deltas[officeName].attacking += delta;
    }
    pipelineMetrics(office: Office) {
        let controllerAnalyst = this.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;
        let logisticsAnalyst = this.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let salesAnalyst = this.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;

        let upgradeDepot = controllerAnalyst.getDesignatedUpgradingLocations(office)?.container
        let storage = logisticsAnalyst.getStorage(office);

        return {
            sourcesLevel: salesAnalyst.getSources(office).reduce((sum, source) => (sum + source.energy), 0),
            sourcesMax: salesAnalyst.getSources(office).reduce((sum, source) => (sum + source.energyCapacity), 0),
            mineContainersLevel: salesAnalyst.getFranchiseLocations(office)
                .reduce((sum, mine) => (sum + (mine.container?.store.energy || 0)), 0),
            mineContainersMax: salesAnalyst.getFranchiseLocations(office)
                .reduce((sum, mine) => (sum + (mine.container?.store.getCapacity() || 0)), 0),
            storageLevel: storage.reduce((sum, container) => (sum + (container.store.energy || 0)), 0),
            storageMax: storage.reduce((sum, container) => (sum + (container.store.getCapacity() || 0)), 0),
            upgradeDepotLevel: upgradeDepot?.store.energy || 0,
            upgradeDepotMax: upgradeDepot?.store.getCapacity() || 0,
            roomEnergyLevel: office.center.room.energyAvailable,
            roomEnergyMax: office.center.room.energyCapacityAvailable,
            buildDelta: this.deltas[office.name].building,
            repairDelta: this.deltas[office.name].repairing,
            healDelta: this.deltas[office.name].healing,
            attackDelta: this.deltas[office.name].attacking,
        }
    }
    taskManagementMetrics(office: Office) {
        let taskManager = office.managers.get('TaskManager') as TaskManager;
        if (!taskManager) return {tasks: {}, requests: {}};

        let taskCount: {[id: string]: number} = {};
        taskManager.tasks.forEach(t => {
            let name = t.actions[0].constructor.name;
            taskCount[name] = 1 + (taskCount[name] || 0);
        });

        let requestCount: {[id: string]: number} = {};
        taskManager.getRequestsFlattened().forEach(r => {
            if (!r.task) return;
            let name = r.task.constructor.name;
            requestCount[name] = 1 + (requestCount[name] || 0);
        });
        return {
            tasks: taskCount,
            requests: requestCount
        }
    }
    exportStats() {
        const stats: {[id: string]: {
            taskManagement: {
                tasks: {[id: string]: number},
                requests: {[id: string]: number},
            },
            pipelineMetrics: {
                sourcesLevel: number,
                mineContainersLevel: number
            },
            controllerProgress: number;
            controllerProgressTotal: number;
            controllerLevel: number; }
        } = {};
        this.boardroom.offices.forEach(office => {
            if (office.center.room.controller?.my) {
                stats[office.name] = {
                    taskManagement: this.taskManagementMetrics(office),
                    pipelineMetrics: this.pipelineMetrics(office),
                    controllerProgress: office.center.room.controller.progress,
                    controllerProgressTotal: office.center.room.controller.progressTotal,
                    controllerLevel: office.center.room.controller.level,
                }
            }
        })
        // Reset stats object
        Memory.stats = {
            gcl: {
                progress: Game.gcl.progress,
                progressTotal: Game.gcl.progressTotal,
                level: Game.gcl.level,
            },
            offices: stats,
            cpu: {
                bucket: Game.cpu.bucket,
                limit: Game.cpu.limit,
                used: Game.cpu.getUsed(),
            },
            time: Game.time,
        };
    }
}
