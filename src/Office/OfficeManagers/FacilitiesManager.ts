import { CachedConstructionSite, CachedStructure, FacilitiesAnalyst } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";
import { TaskRequest } from "TaskRequests/TaskRequest";
import { BuildTask } from "TaskRequests/types/BuildTask";
import { RepairTask } from "TaskRequests/types/RepairTask";
import { getBuildEnergyRemaining, getRepairEnergyRemaining } from "utils/gameObjectSelectors";

const buildPriority = (site: CachedConstructionSite) => {
    // Adds a fractional component to sub-prioritize the most
    // complete construction sites
    let completion = site.progress / site.progressTotal;
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

export class FacilitiesManager extends OfficeManager {
    structures: CachedStructure[] = [];
    sites: CachedConstructionSite[] = [];
    handymen: Creep[] = [];

    repairOrders = new Map<Id<Structure>, TaskRequest>();
    buildOrders = new Map<Id<ConstructionSite>, TaskRequest>();

    plan() {
        let facilitiesAnalyst = global.boardroom.managers.get('FacilitiesAnalyst') as FacilitiesAnalyst;
        // TODO - Update these with callbacks. Until then, load each tick
        this.sites = facilitiesAnalyst.getConstructionSites(this.office);
        this.sites.sort((a, b) => (buildPriority(b) - buildPriority(a)));
        this.structures = facilitiesAnalyst.getStructures(this.office);
        this.handymen = facilitiesAnalyst.getHandymen(this.office);

        // Check if existing requests are fulfilled
        this.repairOrders.forEach((request, id) => {
            if (request.completed) this.repairOrders.delete(id);
        })
        this.buildOrders.forEach((request, id) => {
            if (request.completed) this.buildOrders.delete(id);
        })

        switch (this.status) {
            case OfficeManagerStatus.OFFLINE: {
                // Manager is offline, do nothing
                return;
            }
            case OfficeManagerStatus.MINIMAL: {
                // Perform repairs if needed, or
                // delegate minimal resources to
                // new construction
                let jobs = this.submitRepairOrders(2);
                if (jobs < 2) {
                    jobs += this.submitBuildOrders(2 - jobs);
                }
                if (jobs > 0 && this.handymen.length < 1) {
                    this.office.submit(new MinionRequest(`${this.office.name}_Facilities`, 4, MinionTypes.HANDYMAN))
                }
                return;
            }
            case OfficeManagerStatus.NORMAL: {
                // Perform repairs if needed, or
                // delegate resources to new
                // construction.
                let jobs = this.submitRepairOrders(2);
                if (jobs < 5) {
                    jobs += this.submitBuildOrders(2 - jobs);
                }
                if (jobs > 0 && (this.handymen.length < (jobs / 2) || this.handymen.reduce((a, b) => (a + b.getActiveBodyparts(WORK)), 0) < (5 * jobs))) {
                    this.office.submit(new MinionRequest(`${this.office.name}_Facilities`, 5, MinionTypes.HANDYMAN))
                }
                return;
            }
            case OfficeManagerStatus.PRIORITY: {
                // Dedicate extra resources to
                // new construction, performing
                // repairs if needed.
                let jobs = this.submitRepairOrders(2);
                if (jobs < 5) {
                    jobs += this.submitBuildOrders(2 - jobs);
                }
                if (jobs > 0 && this.handymen.length < jobs) {
                    this.office.submit(new MinionRequest(`${this.office.name}_Facilities`, 6, MinionTypes.HANDYMAN))
                }
                return;
            }
        }
    }
    submitRepairOrders(max = 5) {
        if (this.repairOrders.size >= max) return this.repairOrders.size;

        let repairable = (this.structures.map(s => s.gameObj).filter(structure => {
            if (!structure) return false;
            switch (structure.structureType) {
                case STRUCTURE_WALL:
                    return false;
                    // return (structure.hits < Math.min(100000, structure.hitsMax));
                case STRUCTURE_RAMPART:
                    return ((structure as StructureRampart).my && structure.hits < Math.min(100000, structure.hitsMax));
                default:
                    if (this.status === OfficeManagerStatus.NORMAL || this.status === OfficeManagerStatus.PRIORITY)
                        return structure.hits < (structure.hitsMax * 0.8);
                    return structure.hits < (structure.hitsMax * 0.5); // In MINIMAL mode, repair structures below half health
            }
        }) as Structure[]).sort((a, b) => a.hits - b.hits);
        repairable.slice(0, max - this.repairOrders.size).forEach((structure, i) => {
            let req = new TaskRequest(`${structure.id}_repair`, new RepairTask(structure), 5, getRepairEnergyRemaining(structure), structure.pos);
            this.repairOrders.set(structure.id, req);
            this.office.submit(req);
        })
        return this.repairOrders.size;
    }
    submitBuildOrders(max = 5) {
        if (this.buildOrders.size >= max) return this.buildOrders.size;

        this.sites.slice(0, max - this.buildOrders.size).forEach((site, i) => {
            let req = new TaskRequest(`${this.office.name}_Build_${i}`, new BuildTask(site), 5, getBuildEnergyRemaining(site), site.pos);
            this.buildOrders.set(site.id, req);
            this.office.submit(req);
        })
        return this.buildOrders.size;
    }

    run() {
        if (global.v.construction.state) {
            this.buildOrders.forEach(task => {
                let pos = task.depot
                if (pos) new RoomVisual(pos.roomName).rect(pos.x-1, pos.y-1, 2, 2, {stroke: '#0f0', fill: 'transparent', lineStyle: 'dotted'});
            })
            this.repairOrders.forEach(task => {
                let pos = task.depot
                if (pos) new RoomVisual(pos.roomName).rect(pos.x-1, pos.y-1, 2, 2, {stroke: '#ff0', fill: 'transparent', lineStyle: 'dotted'});
            })
        }
    }
}
