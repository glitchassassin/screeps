import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { TaskRequest } from "TaskRequests/TaskRequest";
import { BuildTask } from "TaskRequests/types/BuildTask";
import { RepairTask } from "TaskRequests/types/RepairTask";
import { countEnergyInContainersOrGround, getBuildEnergyRemaining, getRepairEnergyRemaining } from "utils/gameObjectSelectors";
import { CachedConstructionSite, CachedStructure, FacilitiesAnalyst } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { DepotTask } from "TaskRequests/types/DepotTask";

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

    repairOrders: RoomPosition[] = [];
    buildOrders: RoomPosition[] = [];

    plan() {
        let facilitiesAnalyst = global.boardroom.managers.get('FacilitiesAnalyst') as FacilitiesAnalyst;
        // TODO - Update these with callbacks. Until then, load each tick
        this.sites = facilitiesAnalyst.getConstructionSites(this.office);
        this.structures = facilitiesAnalyst.getStructures(this.office);
        this.handymen = facilitiesAnalyst.getHandymen(this.office);

        this.repairOrders = [];
        this.buildOrders = [];

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
        let repairable = (this.structures.map(s => s.gameObj).filter(structure => {
            if (!structure) return false;
            switch (structure.structureType) {
                case STRUCTURE_WALL:
                    if (structure.hits < 100000) return true;
                case STRUCTURE_RAMPART:
                    if (structure.hits < 100000) return true;
                default:
                    if (this.status === OfficeManagerStatus.NORMAL || this.status === OfficeManagerStatus.PRIORITY)
                        return structure.hits < (structure.hitsMax * 0.8);
                    return structure.hits < (structure.hitsMax * 0.5); // In MINIMAL mode, repair structures below half health
            }
        }) as Structure[]).sort((a, b) => a.hits - b.hits);
        repairable.slice(0, max).forEach((structure, i) => {
            this.repairOrders.push(structure.pos);
            this.office.submit(new TaskRequest(`${this.office.name}_Repair_${i}`, new RepairTask(structure), 5, getRepairEnergyRemaining(structure), structure.pos))
        })
        return Math.min(repairable.length, max);
    }
    submitBuildOrders(max = 5) {
        let buildable = this.sites.sort((a, b) => (buildPriority(b) - buildPriority(a)))

        buildable.slice(0, max).forEach((site, i) => {
            this.buildOrders.push(site.pos);
            let energyNeeded = getBuildEnergyRemaining(site) - countEnergyInContainersOrGround(site.pos)
            this.office.submit(new TaskRequest(`${this.office.name}_Build_${i}`, new BuildTask(site), 5, getBuildEnergyRemaining(site), site.pos))
        })
        return Math.min(buildable.length, max);
    }

    run() {
        if (global.v.construction.state) {
            this.buildOrders.forEach(pos => {
                new RoomVisual(pos.roomName).rect(pos.x-1, pos.y-1, 2, 2, {stroke: '#0f0', fill: 'transparent', lineStyle: 'dotted'});
            })
            this.repairOrders.forEach(pos => {
                new RoomVisual(pos.roomName).rect(pos.x-1, pos.y-1, 2, 2, {stroke: '#ff0', fill: 'transparent', lineStyle: 'dotted'});
            })
        }
    }
}
