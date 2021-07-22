import { BARRIER_LEVEL, PROFILE } from "config";

import { BehaviorResult } from "BehaviorTree/Behavior";
import { BuildRequest } from "BehaviorTree/requests/Build";
import { Controllers } from "WorldState/Controllers";
import { DismantleRequest } from "BehaviorTree/requests/Dismantle";
import { FacilitiesAnalyst } from "Analysts/FacilitiesAnalyst";
import { FacilitiesManager } from "../FacilitiesManager";
import { Health } from "WorldState/Health";
import { LogisticsManager } from "../LogisticsManager";
import { MapAnalyst } from "Analysts/MapAnalyst";
import { OfficeManager } from "Office/OfficeManager";
import type { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";
import { RepairRequest } from "BehaviorTree/requests/Repair";
import { RoomData } from "WorldState/Rooms";
import { Structures } from "WorldState/Structures";
import { getRcl } from "utils/gameObjectSelectors";
import profiler from "screeps-profiler";

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
                structureCounts[r.structure.structureType] ??= 0;
                structureCounts[r.structure.structureType]++;
            }
        }

        // Submit requests, up to the quota, from the build plan,
        // once every 50 ticks
        let plan = FacilitiesAnalyst.getPlannedStructuresByRcl(this.office.name, rcl)
        let plannedStructures = [];
        if (!plan || Game.time % 100 !== 0) return;
        for (let c of plan) {
            c.survey();
            if (!c.structure) {
                // Evaluate build
                let existingStructures = structureCounts[c.structureType] ?? 0;
                let availableStructures = CONTROLLER_STRUCTURES[c.structureType][rcl];
                if (existingStructures < availableStructures) {
                    let req = this.generateBuildRequest(c);
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
                        let req = this.generateRepairRequest(c, barrierLevel);
                        if (req && !facilitiesManager.requests.includes(req)) {
                            facilitiesManager.submit(req);
                        }
                    }
                } else if ((health?.hits ?? 0) < (health?.hitsMax ?? 0) * 0.5) {
                    let req = this.generateRepairRequest(c);
                    if (req && !facilitiesManager.requests.includes(req)) {
                        facilitiesManager.submit(req);
                    }
                }
            }
        }

        // Generate dismantle requests, if needed
        this.generateDismantleRequests(plannedStructures, roomName)
            .forEach(req => facilitiesManager.submit(req))
    }

    generateBuildRequest(structure: PlannedStructure) {
        if (!structure.buildRequest || (!structure.structure && structure.buildRequest.result === BehaviorResult.FAILURE)) {
            structure.buildRequest = new BuildRequest(structure);
        }
        return structure.buildRequest;
    }
    generateRepairRequest(structure: PlannedStructure, targetHealth?: number) {
        if (structure.structure && (
            !structure.repairRequest || (
                structure.repairRequest?.result === BehaviorResult.FAILURE ||
                structure.repairRequest?.result === BehaviorResult.SUCCESS
            )
        )) {
            structure.repairRequest = new RepairRequest(structure.structure, targetHealth);
        }
        return structure.repairRequest;
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
                    // Do not bulldoze the spawn if it is the last one
                    if (
                        structure.structureType !== STRUCTURE_SPAWN ||
                        Structures.byRoom(roomName).filter(s => s.structureType === STRUCTURE_SPAWN).length > 1
                    ) {
                        (structure as Structure).destroy();
                    }
                } else {
                    requests.push(new DismantleRequest(structure));
                }
            }
        }
        return requests;
    }
}

if (PROFILE.managers) profiler.registerClass(BuildStrategist, 'BuildStrategist');
