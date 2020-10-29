import { DepotRequest, TransferRequest } from "Logistics/LogisticsRequest";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";

import { ControllerAnalyst } from "Boardroom/BoardroomManagers/ControllerAnalyst";
import { HRAnalyst } from "Boardroom/BoardroomManagers/HRAnalyst";
import { HRManager } from "../HRManager";
import { LogisticsManager } from "../LogisticsManager";
import { Office } from "Office/Office";
import { OfficeManagerStatus } from "Office/OfficeManager";
import { OfficeTaskManager } from "../OfficeTaskManager/OfficeTaskManager";
import { ReserveTask } from "../OfficeTaskManager/TaskRequests/types/ReserveTask";
import { ShouldReserveTerritory } from "./Strategies/ShouldReserveTerritory";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { Table } from "Visualizations/Table";
import { UpgradeTask } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/types/UpgradeTask";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";

export class LegalManager extends OfficeTaskManager {
    constructor(
        office: Office,
        private controllerAnalyst = office.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst,
        private statisticsAnalyst = office.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst,
        private hrAnalyst = office.boardroom.managers.get('HRAnalyst') as HRAnalyst,
        private logisticsManager = office.managers.get('LogisticsManager') as LogisticsManager,
        private hrManager = office.managers.get('HRManager') as HRManager,
    ) {
        super(office);
    }
    depotRequest?: DepotRequest;

    plan() {
        super.plan();

        let controller = this.controllerAnalyst.getDesignatedUpgradingLocations(this.office);
        let paralegals = Array.from(this.hrAnalyst.getEmployees(this.office, 'PARALEGAL'))
        let lawyers = Array.from(this.hrAnalyst.getEmployees(this.office, 'LAWYER'))

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

        // Evaluate territories to reserve
        this.office.territories.forEach(t => {
            let controller = global.worldState.controllers.byRoom.get(t.name);
            if (!controller) return;
            let blocked = controller.upgradeBlocked - (Game.time - controller.scanned)
            if (ShouldReserveTerritory(t) && blocked < 200) {
                this.submit(t.name, new ReserveTask(controller, 5));
            }
        })

        // Spawn one dedicated upgrader
        if (
            paralegals.length === 0 ||
            (Game.time % 100 === 0 && (this.statisticsAnalyst.metrics.get(this.office.name)?.controllerDepotLevels.asPercentMean() || 0) > 0.5)
        ) {
            // More input than output: spawn more upgraders
            this.hrManager.submit(new MinionRequest(`${this.office.name}_Legal`, 5, MinionTypes.PARALEGAL, {
                manager: this.constructor.name
            }))
        }
        // Spawn lawyers to handle ReserveTask requests
        if (Array.from(this.requests.values()).filter(r => r instanceof ReserveTask).length > lawyers.length) {
            this.hrManager.submit(new MinionRequest(`${this.office.name}_Legal`, 5, MinionTypes.LAWYER, {
                manager: this.constructor.name
            }))
        }


        if (controller?.container) {
            // Just in case we have any pending depots once container is built
            if (this.depotRequest) {
                this.depotRequest.completed = true;
                this.depotRequest = undefined;
            }
            // Place standing order for surplus energy to container
            let e = controller.container ? getTransferEnergyRemaining(controller.container) : 0;
            if (e && e > (CONTAINER_CAPACITY / 2)) {
                this.logisticsManager.submit(controller.container.id, new TransferRequest(controller.container, transferPriority));
            }
        } else if (controller) {
            // Place standing order for upgrade energy
            if (this.office.center.room.controller) {
                if (!this.depotRequest || this.depotRequest.completed) {
                    this.depotRequest = new DepotRequest(controller.pos, 5, 100);
                }
                this.logisticsManager.submit(this.office.center.name, this.depotRequest);
            }
        }
        if (controller) {
            this.submit(this.office.name, new UpgradeTask(controller, 5));
        }
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
