import { byId, getRcl } from "utils/gameObjectSelectors";

import { CarrierMinion } from "MinionDefinitions/CarrierMinion";
import { EngineerMinion } from "MinionDefinitions/EngineerMinion";
import { FacilitiesManager } from "../FacilitiesManager";
import { ForemanMinion } from "MinionDefinitions/ForemanMinion";
import { GuardMinion } from "MinionDefinitions/GuardMinion";
import { HRAnalyst } from "Analysts/HRAnalyst";
import { HRManager } from "../HRManager";
import { InternMinion } from "MinionDefinitions/InternMinion";
import { LawyerMinion } from "MinionDefinitions/LawyerMinion";
import { LegalManager } from "../LegalManager";
import { MineData } from "WorldState/MineData";
import { Minion } from "MinionDefinitions/Minion";
import { OfficeManager } from "Office/OfficeManager";
import { PROFILE } from "config";
import { ParalegalMinion } from "MinionDefinitions/ParalegalMinion";
import { SalesAnalyst } from "Analysts/SalesAnalyst";
import { SalesmanMinion } from "MinionDefinitions/SalesmanMinion";
import { SpawnRequest } from "BehaviorTree/requests/Spawn";
import profiler from "screeps-profiler";

const minionClasses: Record<string, Minion> = {
    SALESMAN: new SalesmanMinion(),
    CARRIER: new CarrierMinion(),
    GUARD: new GuardMinion(),
    ENGINEER: new EngineerMinion(),
    PARALEGAL: new ParalegalMinion(),
    INTERN: new InternMinion(),
    LAWYER: new LawyerMinion(),
    FOREMAN: new ForemanMinion(),
}

export class SpawnStrategist extends OfficeManager {
    plan() {
        if (Game.time - global.lastGlobalReset < 5) return; // Give time for data to catch up to prevent mis-spawns

        // Get spawn queue
        const spawnTargets = this.spawnTargets();
        // Get current employee counts
        const employees = this.getEmployees();

        // Calculate income spawn pressure
        let priorities = ['SALESMAN', 'CARRIER']
            .map(minion => ({
                minion,
                pressure: (employees[minion] ?? 0) / spawnTargets[minion]
            }))
            .filter(({pressure}) => pressure < 1)

        if (!priorities.length) {
            priorities = Object.keys(spawnTargets)
                .map(minion => ({
                    minion,
                    pressure: (employees[minion] ?? 0) / spawnTargets[minion]
                }))
                .filter(({pressure}) => pressure < 1)
        }

        for (let p of priorities) {
            let minion = minionClasses[p.minion]
            let priority = Math.floor(10 * (1 - p.pressure))
            if (minion) {
                this.submitRequest(minion, priority)
            }
        }
    }

    spawnTargets() {
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;
        let legalManager = this.office.managers.get('LegalManager') as LegalManager;
        const rcl = getRcl(this.office.name) ?? 0;

        const spawnTargets: Record<string, number> = {};

        const franchiseCount = SalesAnalyst.getExploitableFranchises(this.office).length;
        const mineCount = MineData.byOffice(this.office).filter(m => (
            byId(m.extractorId) && !byId(m.id)?.ticksToRegeneration
        )).length;
        // Slightly overestimate number of salesmen to account for early transitional periods where we have some lingering
        // low-capacity salesmen
        const workPartsPerSalesman = Math.min(7, Math.floor((Game.rooms[this.office.name].energyCapacityAvailable - 50) / 100));
        const salesmenPerFranchise = Math.ceil(7 / workPartsPerSalesman);

        spawnTargets['SALESMAN'] = franchiseCount * salesmenPerFranchise;

        // More carriers at lower energy levels
        const lowEnergyBonus = Game.rooms[this.office.name].energyCapacityAvailable < 800 ? 1 : 0
        spawnTargets['CARRIER'] = Math.max(spawnTargets['SALESMAN'], (franchiseCount + mineCount) * 1.5 + lowEnergyBonus);

        const workPartsPerEngineer = Math.min(25, Math.floor(((1/2) * Game.rooms[this.office.name].energyCapacityAvailable) / 100));
        spawnTargets['ENGINEER'] = Math.min(
            spawnTargets['SALESMAN'],
            Math.ceil(facilitiesManager.workPending() / (workPartsPerEngineer * 1500 * 2.5))
        );
        spawnTargets['FOREMAN'] = mineCount;

        // Once engineers are done, until room hits RCL 8, surplus energy should go to upgrading
        const workPartsPerParalegal = Math.floor((Game.rooms[this.office.name].energyCapacityAvailable - 100) / 100);
        const paralegals = Math.ceil((franchiseCount * 10) / (UPGRADE_CONTROLLER_POWER * workPartsPerParalegal));
        if (rcl === 8 || spawnTargets['ENGINEER'] > 1) {
            spawnTargets['PARALEGAL'] = 1
        } else if (spawnTargets['SALESMAN'] === 0) {
            spawnTargets['PARALEGAL'] = 0
        } else {
            spawnTargets['PARALEGAL'] = paralegals;
        }

        spawnTargets['INTERN'] = (rcl > 1) ? 1 : 0;

        const lawyerRequests = legalManager.requests.some(r => r.minionType === 'LAWYER');
        spawnTargets['LAWYER'] = lawyerRequests ? 1 : 0;

        return spawnTargets;
    }

    getEmployees() {
        let result = HRAnalyst.getEmployees(this.office, undefined, false)
            .filter(c => (c.ticksToLive ?? 1500) > 100)
            .reduce((employees: Record<string, number>, creep: Creep) => {
                employees[creep.memory.type ?? ''] ??= 0
                employees[creep.memory.type ?? '']++;
                return employees;
            }, {})
        return result;
    }

    submitRequest(minion: Minion, priority: number) {
        let hrManager = this.office.managers.get('HRManager') as HRManager;
        if (!hrManager.requests.some(r => (r as SpawnRequest).type === minion.type)) {
            hrManager.submit(new SpawnRequest(minion, priority));
        }
    }
}

if (PROFILE.managers) profiler.registerClass(SpawnStrategist, 'SpawnStrategist');
