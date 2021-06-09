import { BuildRequest } from "BehaviorTree/requests/Build";
import { FacilitiesManager } from "../FacilitiesManager";
import { OfficeManager } from "Office/OfficeManager";
import { RoomArchitect } from "Boardroom/BoardroomManagers/Architects/RoomArchitect";
import { Structures } from "WorldState/Structures";
import { getRcl } from "utils/gameObjectSelectors";
import profiler from "screeps-profiler";

export class BuildStrategist extends OfficeManager {
    plan() {
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;
        let roomArchitect = global.boardroom.managers.get('RoomArchitect') as RoomArchitect;
        // Select valid structures
        let rcl = getRcl(this.office.name) ?? 0;
        let structureCounts: Record<string, number> = {};
        for (let s of Structures.byRoom(this.office.name)) {
            structureCounts[s.structureType] ??= 0;
            structureCounts[s.structureType]++;
        }
        for (let r of facilitiesManager.requests) {
            if (r instanceof BuildRequest) {
                structureCounts[r.structureType] ??= 0;
                structureCounts[r.structureType]++;
            }
        }

        // Submit requests, up to the quota, from the build plan
        let plan = roomArchitect.roomPlans.get(this.office.name);
        if (!plan) return;
        for (let c of plan.structures) {
            c.survey();
            if (!c.structure) {
                // Evaluate build
                let existingStructures = structureCounts[c.structureType] ?? 0;
                let availableStructures = CONTROLLER_STRUCTURES[c.structureType][rcl];
                if (existingStructures < availableStructures) {
                    let req = c.generateBuildRequest();
                    if (!facilitiesManager.requests.includes(req)) {
                        facilitiesManager.submit(req);
                        structureCounts[c.structureType] = existingStructures + 1;
                    }
                }
            }
        }
    }
}
profiler.registerClass(BuildStrategist, 'BuildStrategist');
