import { LogisticsRequest, TransferRequest } from "Logistics/LogisticsRequest";

import { Capacity } from "WorldState/Capacity";
import { CarrierMinion } from "MinionDefinitions/CarrierMinion";
import { EngineerMinion } from "MinionDefinitions/EngineerMinion";
import { FacilitiesManager } from "../FacilitiesManager";
import { GuardMinion } from "MinionDefinitions/GuardMinion";
import { HRAnalyst } from "Boardroom/BoardroomManagers/HRAnalyst";
import { HRManager } from "../HRManager";
import { InternMinion } from "MinionDefinitions/InternMinion";
import { LawyerMinion } from "MinionDefinitions/LawyerMinion";
import { LogisticsManager } from "../LogisticsManager";
import { Minion } from "MinionDefinitions/Minion";
import { OfficeManager } from "Office/OfficeManager";
import { ParalegalMinion } from "MinionDefinitions/ParalegalMinion";
import { Request } from "BehaviorTree/Request";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { SalesmanMinion } from "MinionDefinitions/SalesmanMinion";
import { SourceType } from "Logistics/LogisticsSource";
import { SpawnRequest } from "BehaviorTree/requests/Spawn";
import { getRcl } from "utils/gameObjectSelectors";

const minionClasses: Record<string, Minion> = {
    SALESMAN: new SalesmanMinion(),
    CARRIER: new CarrierMinion(),
    GUARD: new GuardMinion(),
    ENGINEER: new EngineerMinion(),
    PARALEGAL: new ParalegalMinion(),
    INTERN: new InternMinion(),
    LAWYER: new LawyerMinion()
}

export class SpawnStrategist extends OfficeManager {
    spawnRequest?: Request<StructureSpawn>;

    logisticsRequests = new Map<Id<Structure>, LogisticsRequest>();

    plan() {
        if (Game.time - global.lastGlobalReset < 5) return; // Give time for data to catch up to prevent mis-spawns
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;

        this.submitLogisticsRequests();

        if (this.spawnRequest && !this.spawnRequest.result) return; // Pending request exists
        if ((hrAnalyst.newestEmployee(this.office) ?? 0) > 1490) return; // Wait 10 ticks after previous spawn before considering new requests

        // Get spawn queue
        const spawnTargets = this.spawnTargets();
        // Get current employee counts
        const employees = this.getEmployees();

        // Calculate spawn pressure
        const spawnPressure = Object.keys(spawnTargets)
            .map(minion => ({
                minion,
                pressure: (employees[minion] ?? 0) / spawnTargets[minion]
            }))
            .filter(({pressure}) => pressure < 1)
            .sort((a, b) => a.pressure - b.pressure)

        // Submit request for lowest-pressure minion type
        const minion = minionClasses[spawnPressure.shift()?.minion ?? '']
        if (minion) {
            this.submitRequest(minion)
        }
    }

    spawnTargets() {
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;
        const rcl = getRcl(this.office.name) ?? 0;

        const spawnTargets: Record<string, number> = {};

        const franchiseCount = salesAnalyst.getExploitableFranchises(this.office).length;
        const workPartsPerSalesman = Math.min(5, Math.floor((Game.rooms[this.office.name].energyCapacityAvailable - 50) / 100));
        const salesmenPerFranchise = Math.ceil(5 / workPartsPerSalesman);

        spawnTargets['SALESMAN'] = franchiseCount * salesmenPerFranchise;
        spawnTargets['CARRIER'] = spawnTargets['SALESMAN'];

        const workPartsPerEngineer = Math.min(25, Math.floor(((1/2) * Game.rooms[this.office.name].energyCapacityAvailable) / 100));
        spawnTargets['ENGINEER'] = Math.min(10, Math.ceil(facilitiesManager.workPending() / (workPartsPerEngineer * 1500 * 2.5)));

        // Once engineers are done, until room hits RCL 8, surplus energy should go to upgrading
        if (rcl === 8 || spawnTargets['ENGINEER'] > 1) {
            spawnTargets['PARALEGAL'] = 1
        } else {
            spawnTargets['PARALEGAL'] = franchiseCount;
        }

        spawnTargets['INTERN'] = (rcl > 1) ? 1 : 0;

        return spawnTargets;
    }

    getEmployees() {
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let result = hrAnalyst.getEmployees(this.office, undefined, false).reduce((employees: Record<string, number>, creep: Creep) => {
            employees[creep.memory.type ?? ''] ??= 0
            employees[creep.memory.type ?? '']++;
            return employees;
        }, {})
        return result;
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
                req = new TransferRequest(spawn, 4, Capacity.byId(spawn.id)?.free, SourceType.PRIMARY)
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
// profiler.registerClass(SpawnStrategist, 'SpawnStrategist');
