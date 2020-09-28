import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { TaskRequest } from "tasks/TaskRequest";
import { BuildTask } from "tasks/types/BuildTask";
import { RepairTask } from "tasks/types/RepairTask";
import { getBuildEnergyRemaining, getRepairEnergyRemaining } from "utils/gameObjectSelectors";

const buildPriority = (site: ConstructionSite) => {
    switch(site.structureType) {
        case STRUCTURE_ROAD:
            return 1;
        case STRUCTURE_CONTAINER:
            return 10;
        default:
            return 5;
    }
}

export class FacilitiesManager extends OfficeManager {
    structures: Structure[] = [];
    sites: ConstructionSite[] = [];
    handymen: Creep[] = [];

    init() {

    }

    plan() {
        // TODO - Update these with callbacks. Until then, load each tick
        this.sites = global.analysts.facilities.getConstructionSites(this.office);
        this.structures = global.analysts.facilities.getStructures(this.office);
        this.handymen = global.analysts.facilities.getHandymen(this.office);

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
                let jobs = this.submitRepairOrders(5);
                if (jobs < 5) {
                    jobs += this.submitBuildOrders(5 - jobs);
                }
                if (jobs > 0 && this.handymen.length < (jobs / 2)) {
                    this.office.submit(new MinionRequest(`${this.office.name}_Facilities`, 5, MinionTypes.HANDYMAN))
                }
                return;
            }
            case OfficeManagerStatus.PRIORITY: {
                // Dedicate extra resources to
                // new construction, performing
                // repairs if needed.
                let jobs = this.submitRepairOrders(5);
                if (jobs < 5) {
                    jobs += this.submitBuildOrders(5 - jobs);
                }
                if (jobs > 0 && this.handymen.length < jobs) {
                    this.office.submit(new MinionRequest(`${this.office.name}_Facilities`, 6, MinionTypes.HANDYMAN))
                }
                return;
            }
        }
    }
    submitRepairOrders(max = 5) {
        // If no towers, request repair for structures in need
        let repairable = this.structures.filter(structure => {
            switch (structure.structureType) {
                case STRUCTURE_WALL:
                    if (structure.hits < 100000) return true;
                case STRUCTURE_RAMPART:
                    if (structure.hits < 100000) return true;
                default:
                    return structure.hits < structure.hitsMax;
            }
        }).sort((a, b) => a.hits - b.hits);
        repairable.slice(0, max).forEach((structure, i) => {
            this.office.submit(new TaskRequest(`${this.office.name}_Facilities_Repair_${i}`, new RepairTask(structure), 5, getRepairEnergyRemaining(structure)))
        })
        return Math.min(repairable.length, max);
    }
    submitBuildOrders(max = 5) {
        let buildable = this.sites.sort((a, b) => (buildPriority(a) - buildPriority(b)))

        buildable.slice(0, max).forEach((site, i) => {
            this.office.submit(new TaskRequest(`${this.office.name}_Facilities_Build_${i}`, new BuildTask(site), 5, getBuildEnergyRemaining(site)))
        })
        return Math.min(buildable.length, max);
    }
}
