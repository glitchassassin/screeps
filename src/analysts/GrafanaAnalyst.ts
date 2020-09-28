import { Boardroom } from "Boardroom/Boardroom";
import { Office } from "Office/Office";
import { HRManager } from "Office/OfficeManagers/HRManager";
import { TaskManager } from "Office/OfficeManagers/TaskManager";
import { stringify } from "querystring";
import { Analyst } from "./Analyst";

export class GrafanaAnalyst extends Analyst {
    deltas: {
        [id: string]: {
            building: number,
            repairing: number,
            healing: number,
            attacking: number,
        }
    } = {};
    load = (office: Office) => {
        this.deltas[office.name] = {
            building: 0,
            repairing: 0,
            healing: 0,
            attacking: 0,
        }
    }
    reportBuild(office: Office, delta: number) {
        this.deltas[office.name].building += delta;
    }
    reportRepair(office: Office, delta: number) {
        this.deltas[office.name].repairing += delta;
    }
    reportHeal(office: Office, delta: number) {
        this.deltas[office.name].healing += delta;
    }
    reportAttack(office: Office, delta: number) {
        this.deltas[office.name].attacking += delta;
    }
    pipelineMetrics(office: Office) {
        let upgradeDepot = global.analysts.controller.getDesignatedUpgradingLocations(office)?.container
        let storage = global.analysts.logistics.getStorage(office);
        return {
            sourcesLevel: global.analysts.sales.getSources(office).reduce((sum, source) => (sum + source.energy), 0),
            sourcesMax: global.analysts.sales.getSources(office).reduce((sum, source) => (sum + source.energyCapacity), 0),
            mineContainersLevel: global.analysts.sales.getFranchiseLocations(office)
                .reduce((sum, mine) => (sum + (mine.container?.store.energy || 0)), 0),
            mineContainersMax: global.analysts.sales.getFranchiseLocations(office)
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
    exportStats(boardroom: Boardroom) {
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
        boardroom.offices.forEach(office => {
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
