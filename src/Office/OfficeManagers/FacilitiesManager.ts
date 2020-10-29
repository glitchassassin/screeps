import { CachedConstructionSite, CachedStructure } from "WorldState";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";

import { BuildTask } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/types/BuildTask";
import { DepotRequest } from "Logistics/LogisticsRequest";
import { FacilitiesAnalyst } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { HRManager } from "./HRManager";
import { LogisticsManager } from "./LogisticsManager";
import { Office } from "Office/Office";
import { OfficeManagerStatus } from "Office/OfficeManager";
import { OfficeTaskManager } from "./OfficeTaskManager/OfficeTaskManager";
import { RepairTask } from "Office/OfficeManagers/OfficeTaskManager/TaskRequests/types/RepairTask";
import { Table } from "Visualizations/Table";
import { TaskAction } from "./OfficeTaskManager/TaskRequests/TaskAction";
import profiler from "screeps-profiler";

const buildPriority = (site: CachedConstructionSite) => {
    // Adds a fractional component to sub-prioritize the most
    // complete construction sites
    let completion = (site.progress ?? 0) / (site.progressTotal ?? 0);
    switch(site.structureType) {
        case STRUCTURE_ROAD:
            return 1 + completion;
        case STRUCTURE_CONTAINER:
            return 10 + completion;
        case STRUCTURE_EXTENSION:
            return 12 + completion;
        default:
            return 5 + completion;
    }
}
const repairRemaining = (structure: CachedStructure) => {
    let hitsMax = (structure.hitsMax ?? 0);
    if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
        hitsMax = Math.min(hitsMax, 100000);
    }
    return hitsMax - (structure.hits ?? 0)
}

export class FacilitiesManager extends OfficeTaskManager {
    constructor(
        office: Office,
        private facilitiesAnalyst = office.boardroom.managers.get('FacilitiesAnalyst') as FacilitiesAnalyst
    ) {
        super(office);
    }

    workExpectancy = 0;
    totalWork = 0;

    depotRequests = new Map<TaskAction, DepotRequest|null>();

    plan() {
        super.plan();

        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        let hrManager = this.office.managers.get('HRManager') as HRManager;

        // (WORK * 5) * ttl = max construction output
        // 0.5 = expected efficiency
        this.workExpectancy = 0;
        for (let creep of this.facilitiesAnalyst.getEngineers(this.office)) {
            this.workExpectancy += (creep.gameObj.getActiveBodyparts(WORK) * (creep.gameObj.ticksToLive ?? 1500) * 2.5)
        }
        // Calculate construction energy
        this.totalWork = 0;
        for (let site of this.facilitiesAnalyst.getConstructionSites(this.office)) {
            this.totalWork += ((site.progressTotal ?? 0) - (site.progress ?? 0))
        }
        // Calculate repair energy (and scale by 5, to match construction output rate)
        for (let structure of this.facilitiesAnalyst.getStructures(this.office)) {
            if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) continue;
            this.totalWork += ((repairRemaining(structure) / 100) * 5)
        }

        let engineers = 0;
        for (let i of this.facilitiesAnalyst.getEngineers(this.office)) { engineers += 1 }
        let shouldSpawnEngineer = false;
        let spawnPriority = 5;
        switch (this.status) {
            case OfficeManagerStatus.OFFLINE: {
                // Manager is offline, do nothing
                return;
            }
            case OfficeManagerStatus.MINIMAL: // falls through
            case OfficeManagerStatus.NORMAL: {
                shouldSpawnEngineer = (this.workExpectancy < this.totalWork) && engineers < 8;
                break;
            }
            case OfficeManagerStatus.PRIORITY: {
                shouldSpawnEngineer = (this.workExpectancy < (this.totalWork * 1.5)) && engineers < 8;
                spawnPriority = 6;
                break;
            }
        }

        // Submit prioritized work orders
        this.submitOrders(2);
        if (shouldSpawnEngineer) {
            hrManager.submit(new MinionRequest(`${this.office.name}_Facilities`, spawnPriority, MinionTypes.ENGINEER, {manager: this.constructor.name}))
        }

        // Request depots for active assignments
        for (const [creepId, request] of this.assignments) {
            if (this.depotRequests.has(request)) continue;
            let pos = (request as BuildTask|RepairTask).destination.pos;
            let needsDepot = true;
            for (let [,source] of logisticsManager.sources) {
                if (pos.inRangeTo(source.pos, 5)) {
                    needsDepot = false;
                }
            }
            if (needsDepot) {
                let depotReq = new DepotRequest(pos, request.priority, request.capacity);
                logisticsManager.submit(creepId, depotReq);
                this.depotRequests.set(request, depotReq);
            } else {
                // No depot request needed
                this.depotRequests.set(request, null);
            }
        }

    }
    submitOrders(max = 5) {
        if (this.requests.size >= max) return this.requests.size;

        let repairable = [] as CachedStructure[];
        for (let structure of this.facilitiesAnalyst.getStructures(this.office)) {
            if (!structure || !structure.hits || !structure.hitsMax) return false;
            switch (structure.structureType) {
                case STRUCTURE_WALL:
                    return false;
                    // return (structure.hits < Math.min(100000, structure.hitsMax));
                case STRUCTURE_RAMPART:
                    if (structure.my && structure.hits < Math.min(100000, structure.hitsMax)) repairable.push(structure);
                default:
                    if (this.status === OfficeManagerStatus.NORMAL || this.status === OfficeManagerStatus.PRIORITY)
                        if (structure.hits < (structure.hitsMax * 0.8)) repairable.push(structure);
                    if (structure.hits < (structure.hitsMax * 0.5)) repairable.push(structure); // In MINIMAL mode, repair structures below half health
            }
        }
        repairable.sort((a, b) => (a.hits ?? 0) - (b.hits ?? 0));

        let jobs = 0;
        for (let site of repairable) {
            if (jobs >= (max - this.requests.size)) break;
            this.submit(`${site.id}`, new RepairTask(site, 5));
            jobs += 1;
        }
        for (let site of this.facilitiesAnalyst.getConstructionSites(this.office)) {
            if (jobs >= (max - this.requests.size)) break;
            this.submit(`${site.id}`, new BuildTask(site, Math.floor(buildPriority(site))))
            jobs += 1;
        }
        return this.requests.size;
    }

    run() {
        super.run();
        if (global.v.facilities.state) {
            super.report();
            let statusTable = [
                ['Work Expectancy', 'Work Pending'],
                [this.workExpectancy, this.totalWork]
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

    cleanup() {
        super.cleanup();
        let activeAssignments = Array.from(this.assignments.values());
        for (const [req, depot] of this.depotRequests) {
            if (depot === null) {
                if (!activeAssignments.includes(req)) {
                    this.depotRequests.delete(req);
                }
                continue;
            }
            if (!activeAssignments.includes(req)) {
                depot.completed = true;
            }
            if (depot.completed) {
                this.depotRequests.delete(req);
            }
        }
    }
}


profiler.registerClass(FacilitiesManager, 'FacilitiesManager');
