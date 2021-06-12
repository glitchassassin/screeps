import { LogisticsRequest, TransferRequest } from "Logistics/LogisticsRequest";
import { getRcl, unassignedLogisticsRequestsPercent } from "utils/gameObjectSelectors";

import { Capacity } from "WorldState/Capacity";
import { CarrierMinion } from "MinionDefinitions/CarrierMinion";
import { ControllerAnalyst } from "Boardroom/BoardroomManagers/ControllerAnalyst";
import { EngineerMinion } from "MinionDefinitions/EngineerMinion";
import { FacilitiesAnalyst } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { FacilitiesManager } from "../FacilitiesManager";
import { HRAnalyst } from "Boardroom/BoardroomManagers/HRAnalyst";
import { HRManager } from "../HRManager";
import { InternMinion } from "MinionDefinitions/InternMinion";
import { LegalManager } from "../LegalManager";
import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { LogisticsManager } from "../LogisticsManager";
import { Minion } from "MinionDefinitions/Minion";
import { OfficeManager } from "Office/OfficeManager";
import { ParalegalMinion } from "MinionDefinitions/ParalegalMinion";
import { Request } from "BehaviorTree/Request";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { SalesManager } from "../SalesManager";
import { SalesmanMinion } from "MinionDefinitions/SalesmanMinion";
import { SpawnRequest } from "BehaviorTree/requests/Spawn";
import { StatisticsAnalyst } from "Boardroom/BoardroomManagers/StatisticsAnalyst";
import profiler from "screeps-profiler";

export class SpawnStrategist extends OfficeManager {
    spawnRequest?: Request<StructureSpawn>;

    logisticsRequests = new Map<Id<Structure>, LogisticsRequest>();

    plan() {
        if (Game.time - global.lastGlobalReset < 5) return; // Give time for data to catch up to prevent mis-spawns
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        let legalAnalyst = global.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        let salesManager = this.office.managers.get('SalesManager') as SalesManager;
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;
        let legalManager = this.office.managers.get('LegalManager') as LegalManager;
        let facilitiesAnalyst = global.boardroom.managers.get('FacilitiesAnalyst') as FacilitiesAnalyst;
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let statisticsAnalyst = global.boardroom.managers.get('StatisticsAnalyst') as StatisticsAnalyst;
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;

        let rcl = getRcl(this.office.name) ?? 0;

        this.submitLogisticsRequests();

        if (this.spawnRequest && !this.spawnRequest.result) return; // Pending request exists

        // First priority: Carrier minions.
        // If we just spawned a Carrier minion, wait 100 ticks before spawning a new one.
        // If we have unassigned requests and all Carriers are busy,
        // or if all Carriers will be dead in 50 ticks,
        // we need more carriers
        if ( // Carrier minions
            (hrAnalyst.newestEmployee(this.office, 'CARRIER') ?? 0) < 1400 &&
            (
                (
                    unassignedLogisticsRequestsPercent(this.office) > 0.5 &&
                    logisticsManager.getIdleCarriers().length === 0 &&
                    hrAnalyst.newestEmployee(this.office, 'SALESMAN') !== undefined
                    // salesAnalyst.getFranchiseSurplus(this.office) > 0.5
                )
            )
        ) {
            this.submitRequest(new CarrierMinion());
            return;
        }

        if ( // Salesman minions
            (hrAnalyst.newestEmployee(this.office, 'SALESMAN') ?? 0) < 1400 &&
            (
                salesAnalyst.unassignedHarvestRequests(this.office).length > 0 ||
                salesManager.creepsExpiring(50).length > 0
            ) &&
            salesManager.getAvailableCreeps().length === 0
        ) {
            this.submitRequest(new SalesmanMinion());
            return;
        }

        let legalDepotId = legalAnalyst.getDesignatedUpgradingLocations(this.office)?.containerId
        let legalDepotCapacity = Capacity.byId(legalDepotId)?.capacity ?? 1;
        let legalDepotFreeCapacity = Capacity.byId(legalDepotId)?.free ?? 1;
        let storageCapacity = Capacity.byId(logisticsAnalyst.getStorage(this.office)?.id)?.capacity ?? 0
        // If there is no container, 1/1 === 1 (acts as if container is empty)
        // Otherwise, if capacity is more than 50% full, spawn a new Paralegal
        if ( // Paralegal minions
            hrAnalyst.getEmployees(this.office, 'PARALEGAL', false).length === 0 ||
            (
                (hrAnalyst.newestEmployee(this.office, 'PARALEGAL') ?? 0) < 1400 &&
                (legalDepotFreeCapacity / legalDepotCapacity) < 0.5
            )
        ) {
            this.submitRequest(new ParalegalMinion());
            return;
        }

        // Engineer minions
        const MAX_ENGINEERS = 10;
        if (rcl < 5) {
            let metrics = statisticsAnalyst.metrics.get(this.office.name);
            if (metrics) {
                let input = metrics.mineRate.mean();
                let output = metrics.spawnEnergyRate.mean() + metrics.upgradeRate.mean();
                if (
                    (input - output) > facilitiesAnalyst.getExpectedOutput(this.office) &&
                    MAX_ENGINEERS > facilitiesAnalyst.getEngineers(this.office).length
                ) {
                    this.submitRequest(new EngineerMinion());
                    return;
                }
            }
        } else {
            if (
                (hrAnalyst.newestEmployee(this.office, 'ENGINEER') ?? 0) < 1400 &&
                facilitiesManager.workPending() > facilitiesAnalyst.getWorkExpectancy(this.office)
            ) {
                this.submitRequest(new EngineerMinion());
                return;
            }
        }

        // Scout minions
        if (
            rcl > 3 &&
            (hrAnalyst.newestEmployee(this.office, 'INTERN') ?? 0) < 100
        ) {
            this.submitRequest(new InternMinion());
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
            let req = this.logisticsRequests.get(spawn.id)
            if ((!req || req.completed) && (Capacity.byId(spawn.id)?.free ?? 0) > 0) {
                req = new TransferRequest(spawn, 5)
                logisticsManager.submit(spawn.id, req);
                this.logisticsRequests.set(spawn.id, req);
            }
        }
        let extensions = hrAnalyst.getExtensions(this.office);
        for (let extension of extensions) {
            let req = this.logisticsRequests.get(extension.id)
            if ((!req || req.completed) && (Capacity.byId(extension.id)?.free ?? 0) > 0) {
                req = new TransferRequest(extension, 5)
                logisticsManager.submit(extension.id, req);
                this.logisticsRequests.set(extension.id, req);
            }
        }
    }
}
profiler.registerClass(SpawnStrategist, 'SpawnStrategist');
