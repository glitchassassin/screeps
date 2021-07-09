import { BARRIER_LEVEL } from "config";
import { BuildRequest } from "BehaviorTree/requests/Build";
import { FacilitiesManager } from "../FacilitiesManager";
import { Health } from "WorldState/Health";
import { LogisticsManager } from "../LogisticsManager";
import { OfficeManager } from "Office/OfficeManager";
import { RoomArchitect } from "Boardroom/BoardroomManagers/Architects/RoomArchitect";
import { RoomData } from "WorldState/Rooms";
import { Structures } from "WorldState/Structures";
import { SupportRequest } from "Logistics/LogisticsRequest";
import { getRcl } from "utils/gameObjectSelectors";

export class BuildStrategist extends OfficeManager {
    plan() {
        for (let r of RoomData.byOffice(this.office)) {
            this.planRoom(r.name);
        }
    }
    planRoom(roomName: string) {
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
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
                        if (c.structureType !== STRUCTURE_ROAD) {
                            req.onAssigned = () => {
                                logisticsManager.submit(req.pos.toString(), new SupportRequest(req, CONSTRUCTION_COST[c.structureType]));
                            }
                        }
                        facilitiesManager.submit(req);
                        structureCounts[c.structureType] = existingStructures + 1;
                    }
                }
            } else {
                let health = Health.byId(c.structure.id);
                let barrierLevel = BARRIER_LEVEL[(getRcl(this.office.name) ?? 1)] ?? 0
                // Barrier heuristic
                if (c.structureType === STRUCTURE_WALL || c.structureType === STRUCTURE_RAMPART) {
                    if ((health?.hits ?? 0) < barrierLevel * 0.5) {
                        let req = c.generateRepairRequest(barrierLevel);
                        if (req && !facilitiesManager.requests.includes(req)) {
                            req.onAssigned = () => {
                                let capacity = (
                                    barrierLevel -
                                    (Health.byId(req!.structureId)?.hits ?? 0)
                                ) / 100
                                if (capacity > 1000) {
                                    logisticsManager.submit(req!.pos.toString(), new SupportRequest(req!, capacity));
                                }
                            }
                            facilitiesManager.submit(req);
                        }
                    }
                } else if ((health?.hits ?? 0) < (health?.hitsMax ?? 0) * 0.5) {
                    let req = c.generateRepairRequest();
                    if (req && !facilitiesManager.requests.includes(req)) {
                        req.onAssigned = () => {
                            let capacity = (
                                (Health.byId(req!.structureId)?.hitsMax ?? 0) -
                                (Health.byId(req!.structureId)?.hits ?? 0)
                            ) / 100
                            if (capacity > 1000) {
                                logisticsManager.submit(req!.pos.toString(), new SupportRequest(req!, capacity));
                            }
                        }
                        facilitiesManager.submit(req);
                    }
                }
            }
        }
    }
}
// profiler.registerClass(BuildStrategist, 'BuildStrategist');
