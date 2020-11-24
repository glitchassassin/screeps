import { CachedStructure } from "WorldState";
import { FacilitiesAnalyst } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { FacilitiesManager } from "../FacilitiesManager";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { RepairRequest } from "BehaviorTree/requests/Repair";
import { getRcl } from "utils/gameObjectSelectors";
import profiler from "screeps-profiler";

const BARRIER_LEVEL: Record<number, number> = {
    1: 3e+3,
    2: 3e+3,
    3: 1e+4,
    4: 5e+4,
    5: 1e+5,
    6: 1e+5,
    7: 1e+5,
    8: 1e+5,
}

export class RepairStrategist extends OfficeManager {
    public repairRequests = new Map<CachedStructure, MinionRequest>();

    plan() {
        let facilitiesAnalyst = global.boardroom.managers.get('FacilitiesAnalyst') as FacilitiesAnalyst;
        let barrierLevel = BARRIER_LEVEL[(getRcl(this.office.name) ?? 1)] ?? 0
        for (let s of facilitiesAnalyst.getPlannedStructures(this.office)) {
            if (!s.structure) return; // Not built yet, nothing to repair
            // Barrier heuristic
            if (s.structureType === STRUCTURE_WALL || s.structureType === STRUCTURE_RAMPART) {
                if ((s.structure.hits ?? 0) < barrierLevel * 0.5) {
                    this.submitRequest(s.structure, barrierLevel);
                }
            } else if ((s.structure.hits ?? 0) < (s.structure.hitsMax ?? 0) * 0.5) {
                this.submitRequest(s.structure);
            }
        }
    }

    submitRequest(structure: CachedStructure, barrierLevel?: number) {
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;
        // Check if we already have a harvest request
        let req = this.repairRequests.get(structure);
        if (req && !req.result)     return; // Request is pending
        if (req?.result)            this.repairRequests.delete(structure); // Request completed or failed

        // Otherwise, create a new request
        req = new RepairRequest(structure, barrierLevel)
        facilitiesManager.submit(req);
        this.repairRequests.set(structure, req);
    }
}
profiler.registerClass(RepairStrategist, 'RepairStrategist');
