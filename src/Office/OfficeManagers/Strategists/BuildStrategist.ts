import { BARRIER_LEVEL } from "config";
import { BuildRequest } from "BehaviorTree/requests/Build";
import { Controllers } from "WorldState/Controllers";
import { DismantleRequest } from "BehaviorTree/requests/Dismantle";
import { FacilitiesManager } from "../FacilitiesManager";
import { Health } from "WorldState/Health";
import { LogisticsManager } from "../LogisticsManager";
import { MapAnalyst } from "Analysts/MapAnalyst";
import { OfficeManager } from "Office/OfficeManager";
import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";
import { RoomData } from "WorldState/Rooms";
import { RoomPlanningAnalyst } from "Analysts/RoomPlanningAnalyst";
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
        let plan = RoomPlanningAnalyst.getRoomPlan(roomName);
        let plannedStructures = [];
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
                        if (
                            c.structureType === STRUCTURE_SPAWN &&
                            !Structures.byRoom(roomName).some(s => s.structureType === STRUCTURE_SPAWN)
                        ) {
                            // No spawns - request help from neighboring office
                            const neighbor = [...global.boardroom.offices.values()]
                                .filter(o => o.name !== roomName)
                                .sort(MapAnalyst.sortByDistanceToRoom(roomName))
                                .shift()

                            if (neighbor) {
                                req.priority = 4;
                                (neighbor.managers.get('FacilitiesManager') as FacilitiesManager).submit(req);
                            }
                        } else {
                            if (c.structureType !== STRUCTURE_ROAD) {
                                req.onAssigned = () => {
                                    logisticsManager.submit(req.pos.toString(), new SupportRequest(req, CONSTRUCTION_COST[c.structureType]));
                                }
                            }
                            facilitiesManager.submit(req);
                            plannedStructures.push(c);
                        }
                        structureCounts[c.structureType] = existingStructures + 1;
                    }
                }
            } else {
                plannedStructures.push(c);
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

        // Generate dismantle requests, if needed
        this.generateDismantleRequests(plannedStructures, roomName)
            .forEach(req => facilitiesManager.submit(req))
    }

    generateDismantleRequests(plan: PlannedStructure[], roomName: string) {
        const requests = [];
        for (let structure of Structures.byRoom(roomName).filter(s => s.structureType !== STRUCTURE_CONTROLLER)) {
            let dismantle = false;
            for (let planned of plan) {
                if (planned.structureType === structure.structureType && planned.pos.isEqualTo(structure.pos)) {
                    // Structure is planned, ignore
                    dismantle = false;
                    break;
                }
                if (planned.pos.isNearTo(structure.pos)) {
                    // Structure is near a planned structure
                    // If it is not planned, dismantle it
                    dismantle = true;
                }
            }
            if (dismantle) {
                if (Controllers.byRoom(roomName)?.my) {
                    (structure as Structure).destroy();
                } else {
                    requests.push(new DismantleRequest(structure));
                }
            }
        }
        return requests;
    }
}
// profiler.registerClass(BuildStrategist, 'BuildStrategist');
