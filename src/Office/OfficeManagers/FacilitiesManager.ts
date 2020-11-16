import { BuildRequest } from "BehaviorTree/requests/Build";
import { FacilitiesAnalyst } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { OfficeTaskManager } from "./OfficeTaskManager";
import { RepairRequest } from "BehaviorTree/requests/Repair";
import { Table } from "Visualizations/Table";
import profiler from "screeps-profiler";
import { repairRemaining } from "utils/gameObjectSelectors";

export class FacilitiesManager extends OfficeTaskManager {
    minionTypes = ['ENGINEER'];
    workPending() {
        let pending = 0;
        for (let req of this.requests) {
            if (req instanceof BuildRequest) {
                pending += CONSTRUCTION_COST[req.structureType];
                let site = req.pos.lookFor(LOOK_CONSTRUCTION_SITES).find(s => s.structureType === (req as BuildRequest).structureType)
                if (site) {
                    pending -= site.progress;
                }
            } else if (req instanceof RepairRequest) {
                let hits = (req.repairToHits ?? req.structure.hitsMax ?? 0) - (req.structure.hits ?? 0);
                pending += hits / REPAIR_POWER
            }
        }
        return pending;
    }
    run() {
        super.run();
        if (global.v.facilities.state) {
            super.report();
            let facilitiesAnalyst = global.boardroom.managers.get('FacilitiesAnalyst') as FacilitiesAnalyst
            // (WORK * 5) * ttl = max construction output
            // 0.5 = expected efficiency
            let workExpectancy = facilitiesAnalyst.getWorkExpectancy(this.office);
            // Calculate construction energy
            let totalWork = 0;
            for (let site of facilitiesAnalyst.getConstructionSites(this.office)) {
                totalWork += ((site.progressTotal ?? 0) - (site.progress ?? 0))
            }
            // Calculate repair energy (and scale by 5, to match construction output rate)
            for (let structure of facilitiesAnalyst.getStructures(this.office)) {
                if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) continue;
                totalWork += ((repairRemaining(structure) / 100) * 5)
            }
            let statusTable = [
                ['Work Expectancy', 'Work Pending'],
                [workExpectancy, totalWork]
            ]
            Table(new RoomPosition(2, 2, this.office.center.name), statusTable);
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


profiler.registerClass(FacilitiesManager, 'FacilitiesManager');
