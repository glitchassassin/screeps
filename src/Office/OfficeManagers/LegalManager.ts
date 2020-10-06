import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { UpgradeTask } from "TaskRequests/types/UpgradeTask";
import { WithdrawTask } from "TaskRequests/types/WithdrawTask";
import { TaskRequest } from "TaskRequests/TaskRequest";
import { Task } from "TaskRequests/Task";
import { TravelTask } from "TaskRequests/types/TravelTask";
import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";
import { TaskManager } from "./TaskManager";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";
import { ResupplyTask } from "TaskRequests/types/ResupplyTask";
import { ControllerAnalyst } from "Boardroom/BoardroomManagers/ControllerAnalyst";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { HRAnalyst } from "Boardroom/BoardroomManagers/HRAnalyst";
import { Table } from "Visualizations/Table";
import { DepotTask } from "TaskRequests/types/DepotTask";
import { TransferTask } from "TaskRequests/types/TransferTask";

export class LegalManager extends OfficeManager {
    lawyers: Creep[] = [];
    plan() {
        let controllerAnalyst = global.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;

        let legalFund = controllerAnalyst.getDesignatedUpgradingLocations(this.office);
        this.lawyers = this.office.employees.filter(c => c.memory.type === 'LAWYER');

        switch (this.status) {
            case OfficeManagerStatus.OFFLINE: {
                // Manager is offline, do nothing
                return;
            }
            case OfficeManagerStatus.MINIMAL: {
                // falls through
            }
            case OfficeManagerStatus.NORMAL: {
                // Spawn one dedicated upgrader
                if (this.lawyers.length === 0) {
                    // More input than output: spawn more upgraders
                    this.office.submit(new MinionRequest(`${this.office.name}_Legal`, 5, MinionTypes.LAWYER, {
                        ignoresRequests: true
                    }))
                }
                if (legalFund?.container) {
                    // Place standing order for surplus energy to container
                    let e = getTransferEnergyRemaining(legalFund.container);
                    if (e && e > 0) {
                        this.office.submit(new TaskRequest(legalFund.container.id, new ResupplyTask(legalFund.container), 1, e));
                    }
                } else {
                    // Place standing order for upgrade energy
                    this.office.submit(new TaskRequest(this.office.name, new DepotTask(this.office.center.room.controller?.pos, 1000), 5, 1000));
                }
                return;
            }
            case OfficeManagerStatus.PRIORITY: {
                // Spawn dedicated upgraders as long
                // as there is energy to spend
                if (Game.time % 100 === 0 && (statisticsAnalyst.metrics.get(this.office.name)?.controllerDepotLevels.asPercentMean() || 0) > 0.5) {
                    // More input than output: spawn more upgraders
                    this.office.submit(new MinionRequest(`${this.office.name}_Legal`, 5, MinionTypes.LAWYER, {
                        ignoresRequests: true
                    }))
                }
                // Place order for surplus energy
                if (legalFund?.container) {
                    let e = getTransferEnergyRemaining(legalFund.container);
                    if (e && e > 0) {
                        this.office.submit(new TaskRequest(legalFund.container.id, new ResupplyTask(legalFund.container), 4, e));
                    }
                } else {
                    // Place standing order for upgrade energy
                    this.office.submit(new TaskRequest(this.office.name, new DepotTask(this.office.center.room.controller?.pos, 1000), 5, 1000));
                }
                return;
            }
        }
    }
    run() {
        if (global.v.legal.state) { this.report(); }
        let room = this.office.center.room;
        let taskManager = this.office.managers.get('TaskManager') as TaskManager;

        if (!taskManager || !room.controller || this.lawyers.length === 0) return;

        this.lawyers.forEach(lawyer => {
            if (taskManager.isIdle(lawyer)) {
                // Send upgrader to controller
                taskManager.assign(new Task([
                    new UpgradeTask(room.controller)
                ], lawyer, `${this.office.name}_Legal`));
            }
        })
    }
    report() {
        let controllers = [this.office.center, ...this.office.territories].map(t => [
            t.name,
            t.controller.owner || t.controller.reservation?.username || '',
            t.controller.reservation?.ticksToEnd || ''
        ])
        let controllerTable = [
            ['Controller', 'Owner', 'Reserved'],
            ...controllers
        ]
        Table(new RoomPosition(2, 2, this.office.center.name), controllerTable);
    }
}
