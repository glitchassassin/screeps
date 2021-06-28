import { BuildRequest } from "BehaviorTree/requests/Build";
import { FacilitiesManager } from "../FacilitiesManager";
import { OfficeManager } from "Office/OfficeManager";
import { RoomArchitect } from "Boardroom/BoardroomManagers/Architects/RoomArchitect";
import { RoomData } from "WorldState/Rooms";
import { Structures } from "WorldState/Structures";
import { getRcl } from "utils/gameObjectSelectors";

export class BuildStrategist extends OfficeManager {
    plan() {
        for (let r of RoomData.byOffice(this.office)) {
            this.planRoom(r.name);
        }
    }
    planRoom(roomName: string) {
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;
        let roomArchitect = global.boardroom.managers.get('RoomArchitect') as RoomArchitect;
        // Select valid structures
        let rcl = getRcl(roomName) ?? 0;
        let structureCounts: Record<string, number> = {};
        for (let s of Structures.byRoom(roomName)) {
            structureCounts[s.structureType] ??= 0;
            structureCounts[s.structureType]++;
        }
        for (let r of facilitiesManager.requests) {
            if (r instanceof BuildRequest && r.pos.roomName === roomName) {
                structureCounts[r.structureType] ??= 0;
                structureCounts[r.structureType]++;
            }
        }

        // Submit requests, up to the quota, from the build plan,
        // once every 50 ticks
        let plan = roomArchitect.roomPlans.get(roomName);
        if (!plan || Game.time % 100 !== 0) return;
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
// profiler.registerClass(BuildStrategist, 'BuildStrategist');
