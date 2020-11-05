import { CachedSpawn } from "WorldState";
import { CarrierMinion } from "MinionDefinitions/CarrierMinion";
import { ControllerAnalyst } from "Boardroom/BoardroomManagers/ControllerAnalyst";
import { EngineerMinion } from "MinionDefinitions/EngineerMinion";
import { FacilitiesAnalyst } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { HRAnalyst } from "Boardroom/BoardroomManagers/HRAnalyst";
import { HRManager } from "./HRManager";
import { LogisticsManager } from "./LogisticsManager";
import { Minion } from "MinionDefinitions/Minion";
import { OfficeManager } from "Office/OfficeManager";
import { ParalegalMinion } from "MinionDefinitions/ParalegalMinion";
import { Request } from "BehaviorTree/Request";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { SalesmanMinion } from "MinionDefinitions/SalesmanMinion";
import { SpawnRequest } from "BehaviorTree/requests/Spawn";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import { TransferRequest } from "Logistics/LogisticsRequest";
import { unassignedLogisticsRequests } from "utils/gameObjectSelectors";

export class SpawnStrategist extends OfficeManager {
    spawnRequest?: Request<CachedSpawn>;

    plan() {
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        let legalAnalyst = global.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;
        let facilitiesAnalyst = global.boardroom.managers.get('FacilitiesAnalyst') as FacilitiesAnalyst;
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;

        this.submitLogisticsRequests();

        if (this.spawnRequest && !this.spawnRequest.result) return; // Pending request exists

        // First priority: Carrier minions.
        // If we have unassigned requests,
        if ( // Carrier minions
            unassignedLogisticsRequests(this.office).length > 0 &&
            salesAnalyst.getFranchiseSurplus(this.office) > 0.1
        ) {
            this.submitRequest(new CarrierMinion());
            return;
        }

        if ( // Salesman minions
            salesAnalyst.unassignedHarvestRequests(this.office).length > 0
        ) {
            this.submitRequest(new SalesmanMinion());
            return;
        }

        if ( // Paralegal minions
            legalAnalyst.unassignedUpgradeRequests(this.office).length > 0
        ) {
            this.submitRequest(new ParalegalMinion());
            return;
        }

        // Engineer minions
        const MAX_ENGINEERS = 10;
        let metrics = statisticsAnalyst.metrics.get(this.office.name);
        if (metrics) {
            let input = metrics.mineRate.mean();
            let output = metrics.spawnEnergyRate.mean() + metrics.upgradeRate.mean();
            if (
                (input - output) > facilitiesAnalyst.getExpectedOutput(this.office) &&
                MAX_ENGINEERS < facilitiesAnalyst.getEngineers(this.office).length
            ) {
                this.submitRequest(new EngineerMinion());
                return;
            }
        }

    }

    submitRequest(minion: Minion) {
        let hrManager = this.office.managers.get('HRManager') as HRManager;
        this.spawnRequest = new SpawnRequest(minion);
        hrManager.submit(this.spawnRequest);
    }

    submitLogisticsRequests() {
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        for (let spawn of hrAnalyst.getSpawns(this.office)) {
            logisticsManager.submit(spawn.id, new TransferRequest(spawn, 5));
        }
        for (let extension of hrAnalyst.getExtensions(this.office)) {
            logisticsManager.submit(extension.id, new TransferRequest(extension, 5));
        }

    }
}
