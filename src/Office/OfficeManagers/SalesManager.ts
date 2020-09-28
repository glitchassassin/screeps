import { Franchise, SalesAnalyst } from "analysts/SalesAnalyst";
import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";
import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { Task } from "tasks/Task";
import { HarvestTask } from "tasks/types/HarvestTask";
import { TravelTask } from "tasks/types/TravelTask";
import { TaskManager } from "./TaskManager";

export class SalesManager extends OfficeManager {
    franchises: Franchise[] = [];

    plan() {
        this.franchises = global.analysts.sales.getFranchiseLocations(this.office);

        switch (this.status) {
            case OfficeManagerStatus.OFFLINE: {
                // Manager is offline, do nothing
                return;
            }
            case OfficeManagerStatus.MINIMAL: {
                // There is no "minimal" level for income,
                // so this
                // falls through
            }
            case OfficeManagerStatus.NORMAL: {
                // Maintains one miner per source, if
                // containers are implemented, or spawns
                // interns indefinitely otherwise
                let jobs = this.submitRepairOrders(5);
                if (jobs < 5) {
                    jobs += this.submitBuildOrders(5 - jobs);
                }
                if (jobs > 0 && this.handymen.length < (jobs / 2)) {
                    this.office.submit(new MinionRequest(`${this.office.name}_Facilities`, 5, MinionTypes.BUILDER))
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
                    this.office.submit(new MinionRequest(`${this.office.name}_Facilities`, 6, MinionTypes.BUILDER))
                }
                return;
            }
        }

        // Do we have containers set up yet?
        if (this.franchises.length > 0 && this.franchises.every(franchise => franchise.container)) {
            // If so, make sure we have dedicated salesmen spawned
            this.franchises.forEach(franchise => {
                if (franchise.salesmen.length === 0) {
                    this.office.submit(new MinionRequest(franchise.id, 10, MinionTypes.MINER, {
                        source: franchise.id,
                        ignoresRequests: true
                    }))
                } else {
                    let newestMiner = franchise.salesmen.reduce((a, b) => ((a.ticksToLive || 1500) > (b.ticksToLive || 1500) ? a : b));
                    if (newestMiner.ticksToLive &&
                        newestMiner.memory.arrived &&
                        newestMiner.ticksToLive <= Math.min(50, newestMiner.memory.arrived)
                    ) {
                        this.office.submit(new MinionRequest(franchise.id, 10, MinionTypes.MINER, {
                            source: franchise.id,
                            ignoresRequests: true
                        }))
                    }
                }

            })
        } else {
            // Otherwise, just keep spawning pioneer minions
            this.office.submit(new MinionRequest(`${this.office.name}_SourceManager`, 10, MinionTypes.PIONEER, {}))
        }
    }
    run() {
        let taskManager = this.office.managers.get('TaskManager') as TaskManager;
        if (!taskManager) return;

        this.franchises.forEach(franchise => {
            if (!franchise.source) return;
            franchise.salesmen.forEach(salesman => {
                if (taskManager.isIdle(salesman)) {
                    // If miner is not at mine site, go there
                    if (!salesman.pos.isEqualTo(franchise.pos)) {
                        taskManager.assign(new Task([new TravelTask(franchise.pos, 0)], salesman, franchise.id));
                    } else {
                        if (salesman.memory.spawned && !salesman.memory.arrived) {
                            salesman.memory.arrived = Game.time - salesman.memory.spawned;
                        }
                    }
                    // If mine container is not full, keep mining
                    if (franchise.container?.store.getFreeCapacity() !== 0) {
                        taskManager.assign(new Task([new HarvestTask(franchise.source)], salesman, franchise.id));
                    }
                }
            })
        })
    }
}
