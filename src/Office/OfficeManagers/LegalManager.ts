import { ControllerAnalyst } from "Boardroom/BoardroomManagers/ControllerAnalyst";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { DepotRequest, TransferRequest } from "Logistics/LogisticsRequest";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { OfficeManagerStatus } from "Office/OfficeManager";
import { UpgradeTask } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/types/UpgradeTask";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";
import { Table } from "Visualizations/Table";
import { HRManager } from "./HRManager";
import { LogisticsManager } from "./LogisticsManager";
import { OfficeTaskManager } from "./OfficeTaskManager/OfficeTaskManager";

export class LegalManager extends OfficeTaskManager {
    lawyers: Creep[] = [];
    depotRequest?: DepotRequest;

    plan() {
        super.plan();
        let controllerAnalyst = global.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        let hrManager = this.office.managers.get('HRManager') as HRManager;
        let legalFund = controllerAnalyst.getDesignatedUpgradingLocations(this.office);
        this.lawyers = this.office.employees.filter(c => c.memory.type === 'LAWYER');

        let transferPriority = 1;
        switch (this.status) {
            case OfficeManagerStatus.OFFLINE: {
                // Manager is offline, do nothing
                return;
            }
            case OfficeManagerStatus.MINIMAL: // fall through
            case OfficeManagerStatus.NORMAL: {
                break;
            }
            case OfficeManagerStatus.PRIORITY: {
                transferPriority = 4;
                break;
            }
        }

        // Spawn one dedicated upgrader
        if (
            this.lawyers.length === 0 ||
            (Game.time % 100 === 0 && (statisticsAnalyst.metrics.get(this.office.name)?.controllerDepotLevels.asPercentMean() || 0) > 0.5)
        ) {
            // More input than output: spawn more upgraders
            hrManager.submit(new MinionRequest(`${this.office.name}_Legal`, 5, MinionTypes.LAWYER, {
                manager: this.constructor.name
            }))
        }
        if (legalFund?.container) {
            // Just in case we have any pending depots once container is built
            if (this.depotRequest) {
                this.depotRequest.completed = true;
                this.depotRequest = undefined;
            }
            // Place standing order for surplus energy to container
            let e = getTransferEnergyRemaining(legalFund.container);
            if (e && e > 0) {
                logisticsManager.submit(legalFund.container.id, new TransferRequest(legalFund.container, transferPriority));
            }
        } else {
            // Place standing order for upgrade energy
            if (this.office.center.room.controller) {
                if (!this.depotRequest || this.depotRequest.completed) {
                    this.depotRequest = new DepotRequest(this.office.center.room.controller.pos, 5, 100);
                }
                logisticsManager.submit(this.office.center.name, this.depotRequest);
            }
        }

        this.lawyers.forEach(lawyer => {
            if (this.isIdle(lawyer)) {
                // Send upgrader to controller
                this.submit(lawyer.id, new UpgradeTask(this.office.center.room.controller as StructureController, 5));
            }
        })
    }
    run() {
        super.run()
        if (global.v.legal.state) { this.report(); }
    }
    report() {
        super.report();
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
