import { ControllerAnalyst } from "Boardroom/BoardroomManagers/ControllerAnalyst";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { DepotRequest, TransferRequest } from "Logistics/LogisticsRequest";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { OfficeManagerStatus } from "Office/OfficeManager";
import { UpgradeTask } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/types/UpgradeTask";
import { getTransferEnergyRemaining } from "utils/gameObjectSelectors";
import { Table } from "Visualizations/Table";
import { HRManager } from "../HRManager";
import { LogisticsManager } from "../LogisticsManager";
import { OfficeTaskManager } from "../OfficeTaskManager/OfficeTaskManager";
import { ReserveTask } from "../OfficeTaskManager/TaskRequests/types/ReserveTask";
import { ShouldReserveTerritory } from "./Strategies/ShouldReserveTerritory";

export class LegalManager extends OfficeTaskManager {
    paralegals: Creep[] = [];
    lawyers: Creep[] = [];
    depotRequest?: DepotRequest;

    plan() {
        super.plan();
        let controllerAnalyst = global.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        let hrManager = this.office.managers.get('HRManager') as HRManager;
        let legalFund = controllerAnalyst.getDesignatedUpgradingLocations(this.office);
        this.paralegals = this.office.employees.filter(c => c.memory.type === 'PARALEGAL');
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

        // Evaluate territories to reserve
        this.office.territories.forEach(t => {
            let blocked = t.controller.blocked ?? 0 - (Game.time - (t.controller.scanned ?? 0))
            if (ShouldReserveTerritory(t) && blocked < 200) {
                this.submit(t.name, new ReserveTask(t, 5));
            }
        })

        // Spawn one dedicated upgrader
        if (
            this.paralegals.length === 0 ||
            (Game.time % 100 === 0 && (statisticsAnalyst.metrics.get(this.office.name)?.controllerDepotLevels.asPercentMean() || 0) > 0.5)
        ) {
            // More input than output: spawn more upgraders
            hrManager.submit(new MinionRequest(`${this.office.name}_Legal`, 5, MinionTypes.PARALEGAL, {
                manager: this.constructor.name
            }))
        }
        // Spawn lawyers to handle ReserveTask requests
        if (Array.from(this.requests.values()).filter(r => r instanceof ReserveTask).length > this.lawyers.length) {
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
            if (e && e > (CONTAINER_CAPACITY / 2)) {
                logisticsManager.submit(legalFund.container.id, new TransferRequest(legalFund.container, transferPriority));
            }
        } else if (legalFund) {
            // Place standing order for upgrade energy
            if (this.office.center.room.controller) {
                if (!this.depotRequest || this.depotRequest.completed) {
                    this.depotRequest = new DepotRequest(legalFund.pos, 5, 100);
                }
                logisticsManager.submit(this.office.center.name, this.depotRequest);
            }
        }

        this.submit(this.office.name, new UpgradeTask(this.office.center.room.controller as StructureController, 5));
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
