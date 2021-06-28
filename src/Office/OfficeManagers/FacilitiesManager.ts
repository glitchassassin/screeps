import { Dashboard, Label, Rectangle, Table } from "screeps-viz";

import { BuildRequest } from "BehaviorTree/requests/Build";
import { ConstructionSites } from "WorldState/ConstructionSites";
import { FacilitiesAnalyst } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { Health } from "WorldState/Health";
import { OfficeTaskManager } from "./OfficeTaskManager";
import { RepairRequest } from "BehaviorTree/requests/Repair";

export class FacilitiesManager extends OfficeTaskManager {
    minionTypes = ['ENGINEER'];

    dashboard = Dashboard({ room: this.office.name, widgets: [
        {
            pos: { x: 1, y: 1 },
            width: 47,
            height: 2,
            widget: Rectangle(Label(() => 'Facilities Manager Report'))
        },
        {
            pos: { x: 32, y: 11 },
            width: 5,
            height: 10,
            widget: Rectangle(this.idleMinionsTable)
        },
        {
            pos: { x: 1, y: 5 },
            width: 30,
            height: 30,
            widget: Rectangle(this.requestsTable)
        },
        {
            pos: { x: 32, y: 5 },
            width: 15,
            height: 5,
            widget: Rectangle(Table(() => {
                let facilitiesAnalyst = global.boardroom.managers.get('FacilitiesAnalyst') as FacilitiesAnalyst
                // (WORK * 5) * ttl = max construction output
                // 0.5 = expected efficiency
                let workExpectancy = facilitiesAnalyst.getWorkExpectancy(this.office);
                // Calculate construction energy
                let totalWork = this.workPending();
                return [[workExpectancy, totalWork]]
            }, {
                headers: ['Work Expectancy', 'Work Pending']
            }))
        },
    ]})

    workPending() {
        let pending = 0;
        for (let req of this.requests) {
            if (req instanceof BuildRequest) {
                pending += CONSTRUCTION_COST[req.structureType];

                let site = ConstructionSites.byPos(req.pos);
                if (site && req.structureType === site.structureType) {
                    pending -= site.progress;
                }
            } else if (req instanceof RepairRequest) {
                let health = Health.byId(req.structureId)
                let hits = (req.repairToHits ?? health?.hitsMax ?? 0) - (health?.hits ?? 0);
                pending += hits / REPAIR_POWER
            }
        }
        return pending;
    }

    run() {
        super.run();
        if (global.v.facilities.state) {
            this.dashboard();
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


// profiler.registerClass(FacilitiesManager, 'FacilitiesManager');
