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
                        ignoresRequests: !!legalFund?.container
                    }))
                }
                if (legalFund?.container) {
                    // Place standing order for surplus energy to container
                    let e = getTransferEnergyRemaining(legalFund.container);
                    if (e && e > 2500) {
                        this.office.submit(new TaskRequest(legalFund.container.id, new ResupplyTask(legalFund.container), 1, e));
                    }
                } else {
                    // Place standing order for upgrades
                    this.office.submit(new TaskRequest(this.office.name, new UpgradeTask(this.office.center.room.controller), 5, 1000));
                }
                return;
            }
            case OfficeManagerStatus.PRIORITY: {
                // Spawn dedicated upgraders as long
                // as there is energy to spend
                if (Game.time % 100 === 0 && statisticsAnalyst.metrics[this.office.name].controllerDepotLevels.asPercent.mean() > 0.5) {
                    // More input than output: spawn more upgraders
                    this.office.submit(new MinionRequest(`${this.office.name}_Legal`, 5, MinionTypes.LAWYER, {
                        ignoresRequests: !!legalFund?.container
                    }))
                }
                // Place order for surplus energy
                if (legalFund?.container) {
                    let e = getTransferEnergyRemaining(legalFund.container);
                    if (e && e > 0) {
                        this.office.submit(new TaskRequest(legalFund.container.id, new ResupplyTask(legalFund.container), 4, e));
                    }
                } else {
                    // Place standing order for upgrades
                    this.office.submit(new TaskRequest(this.office.name, new UpgradeTask(this.office.center.room.controller), 5, 1000));
                }
                return;
            }
        }
    }
    run() {
        let controllerAnalyst = global.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let room = this.office.center.room;
        let taskManager = this.office.managers.get('TaskManager') as TaskManager;
        let depot = controllerAnalyst.getDesignatedUpgradingLocations(this.office);
        // If the dedicated container doesn't exist, fall back to upgrade requests instead
        if (!taskManager || !room.controller || !depot?.container || this.lawyers.length === 0) return;

        this.lawyers.forEach(lawyer => {
            if (taskManager.isIdle(lawyer)) {
                if(lawyer.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    // Upgrader has energy - dump it into controller
                    taskManager.assign(new Task([
                        new TravelTask((room.controller as StructureController).pos, 3),
                        new UpgradeTask(room.controller)
                    ], lawyer, `${this.office.name}_Legal`));
                } else {
                    // Upgrader needs energy - get from dedicated controller container
                    if (!depot?.container) return;
                    taskManager.assign(new Task([
                        new TravelTask(depot.container.pos, 1),
                        new WithdrawTask(depot.container)
                    ], lawyer, `${this.office.name}_Legal`));
                }
            }
        })
    }
}
