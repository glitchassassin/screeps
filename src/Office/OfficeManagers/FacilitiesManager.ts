import { BARRIER_LEVEL, PROFILE } from "config";
import { Dashboard, Label, Rectangle, Table } from "screeps-viz";

import { BuildRequest } from "BehaviorTree/requests/Build";
import { ConstructionSites } from "WorldState/ConstructionSites";
import { FacilitiesAnalyst } from "Analysts/FacilitiesAnalyst";
import { Health } from "WorldState/Health";
import { OfficeTaskManager } from "./OfficeTaskManager";
import { RepairRequest } from "BehaviorTree/requests/Repair";
import profiler from "screeps-profiler";

export class FacilitiesManager extends OfficeTaskManager {
    minionTypes = ['ENGINEER'];
    sortRequestsByCreepDistance = false;
    sortRequestsByControllerDistance = false;

    dashboard = [
        {
            pos: { x: 1, y: 1 },
            width: 47,
            height: 2,
            widget: Rectangle({ data: Label({ data: 'Facilities Manager Report' }) })
        },
        {
            pos: { x: 32, y: 11 },
            width: 5,
            height: 10,
            widget: Rectangle({ data: this.idleMinionsTable })
        },
        {
            pos: { x: 1, y: 5 },
            width: 30,
            height: 30,
            widget: Rectangle({ data: this.requestsTable })
        },
        {
            pos: { x: 32, y: 5 },
            width: 15,
            height: 5,
            widget: Rectangle({ data: Table(() => {
                // (WORK * 5) * ttl = max construction output
                // 0.5 = expected efficiency
                let workExpectancy = FacilitiesAnalyst.getWorkExpectancy(this.office);
                // Calculate construction energy
                let totalWork = this.workPending();
                return {
                    data: [[workExpectancy, totalWork]],
                    config: {
                        headers: ['Work Expectancy', 'Work Pending']
                    }
                }
            }) })
        },
    ];

    workPending() {
        let pending = 0;
        let rcl = this.office.controller.level;
        for (let req of this.requests) {
            if (req instanceof BuildRequest) {
                if (!([STRUCTURE_RAMPART, STRUCTURE_WALL] as string[]).includes(req.structure.structureType)) {
                    pending += CONSTRUCTION_COST[req.structure.structureType];
                } else {
                    pending += BARRIER_LEVEL[rcl]
                }

                let site = ConstructionSites.byPos(req.pos);
                if (site && req.structure.structureType === site.structureType) {
                    pending -= site.progress;
                }
            } else if (req instanceof RepairRequest) {
                let health = Health.byId(req.structure.structureId)
                let hits = (req.repairToHits ?? health?.hitsMax ?? 0) - (health?.hits ?? 0);
                pending += hits / REPAIR_POWER
            }
        }
        return pending;
    }

    run() {
        super.run();
        if (global.v.facilities.state) {
            Dashboard({
                widgets: this.dashboard,
                config: { room: this.office.name }
            });
        }
        if (global.v.construction.state) {
            this.requests.forEach(task => {
                if (task instanceof BuildRequest) {
                    new RoomVisual(task.pos.roomName).rect(task.pos.x-1, task.pos.y-1, 2, 2, {stroke: '#0f0', fill: 'transparent', lineStyle: 'dotted'});
                } else if (task instanceof RepairRequest) {
                    new RoomVisual(task.pos.roomName).rect(task.pos.x-1, task.pos.y-1, 2, 2, {stroke: 'yellow', fill: 'transparent', lineStyle: 'dotted'});
                }
            })
        }
    }
}

if (PROFILE.managers) profiler.registerClass(FacilitiesManager, 'FacilitiesManager');
