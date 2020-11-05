import { BuildTask } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/types/BuildTask";
import { FacilitiesAnalyst } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { OfficeTaskManager } from "./OfficeTaskManager/OfficeTaskManager";
import { RepairTask } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/types/RepairTask";
import { Table } from "Visualizations/Table";
import profiler from "screeps-profiler";
import { repairRemaining } from "utils/gameObjectSelectors";

export class FacilitiesManager extends OfficeTaskManager {
    minionTypes = ['ENGINEER'];
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
                if (task instanceof BuildTask) {
                    new RoomVisual(task.destination.pos.roomName).rect(task.destination.pos.x-1, task.destination.pos.y-1, 2, 2, {stroke: '#0f0', fill: 'transparent', lineStyle: 'dotted'});
                } else if (task instanceof RepairTask) {
                    new RoomVisual(task.destination.pos.roomName).rect(task.destination.pos.x-1, task.destination.pos.y-1, 2, 2, {stroke: 'yellow', fill: 'transparent', lineStyle: 'dotted'});
                }
            })
        }
    }
}


profiler.registerClass(FacilitiesManager, 'FacilitiesManager');
