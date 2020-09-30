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
                        ignoresRequests: true
                    }))
                }
                // Place standing order for surplus energy
                if (legalFund?.container) {
                    let e = getTransferEnergyRemaining(legalFund.container);
                    if (e && e > 2500) {
                        this.office.submit(new TaskRequest(legalFund.container.id, new ResupplyTask(legalFund.container), 1, e));
                    }
                }
                return;
            }
            case OfficeManagerStatus.PRIORITY: {
                // Spawn dedicated upgraders as long
                // as there is energy to spend
                if (Game.time % 100 === 0 && statisticsAnalyst.metrics[this.office.name].controllerDepotLevels.asPercent.mean() > 0.5) {
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
        if (!taskManager || !room.controller || this.lawyers.length === 0) return;

        this.lawyers.forEach(lawyer => {
            if (taskManager.isIdle(lawyer)) {
                if(lawyer.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    // Upgrader has energy - dump it into controller
                    taskManager.assign(new Task([
                        new TravelTask((room.controller as StructureController).pos, 3),
                        new UpgradeTask(room.controller)
                    ], lawyer, `${this.office.name}_Legal`));
                } else {
                    // Upgrader needs energy - get from controller container, preferably
                    let depot = controllerAnalyst.getDesignatedUpgradingLocations(this.office);
                    if (depot && depot.container) {
                        taskManager.assign(new Task([
                            new TravelTask(depot.container.pos, 1),
                            new WithdrawTask(depot.container)
                        ], lawyer, `${this.office.name}_Legal`));
                    } else {
                        // No upgrader depot exists yet; see if there's a spawn we can withdraw from instead
                        let spawn = hrAnalyst.getSpawns(this.office).find(s => s.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
                        if (spawn) {
                            taskManager.assign(new Task([
                                new TravelTask(spawn.pos, 1),
                                new WithdrawTask(spawn)
                            ], lawyer, `${this.office.name}_Legal`));
                        }
                    }
                }
            }
        })
    }
}
