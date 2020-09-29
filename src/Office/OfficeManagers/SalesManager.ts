import { OfficeManager, OfficeManagerStatus } from "Office/OfficeManager";
import { MinionRequest, MinionTypes } from "MinionRequests/MinionRequest";
import { Task } from "TaskRequests/Task";
import { HarvestTask } from "TaskRequests/types/HarvestTask";
import { TravelTask } from "TaskRequests/types/TravelTask";
import { TaskManager } from "./TaskManager";
import { Franchise, SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";

export class SalesManager extends OfficeManager {
    franchises: Franchise[] = [];

    plan() {
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        this.franchises = salesAnalyst.getFranchiseLocations(this.office);

        switch (this.status) {
            case OfficeManagerStatus.OFFLINE: {
                // Manager is offline, do nothing
                return;
            }
            case OfficeManagerStatus.MINIMAL: {
                // Spawn Interns indefinitely
                this.office.submit(new MinionRequest(`${this.office.name}_SourceManager`, 10, MinionTypes.INTERN, {}));
                return;
            }
            default: {
                // Maintains one Salesman per source,
                // respawning with a little lead time
                // to minimize downtime
                this.franchises.forEach(franchise => {
                    if (franchise.salesmen.length === 0) {
                        // No salesmen at the franchise: spawn one
                        this.office.submit(new MinionRequest(franchise.id, 10, MinionTypes.SALESMAN, {
                            source: franchise.id,
                            ignoresRequests: true
                        }))
                    } else {
                        // At least one salesman is assigned here; if the
                        // newest one is dying soon, spawn a new one.
                        let newestSalesman = franchise.salesmen.reduce((a, b) => ((a.ticksToLive || 1500) > (b.ticksToLive || 1500) ? a : b));
                        if (newestSalesman.ticksToLive &&
                            newestSalesman.memory.arrived &&
                            newestSalesman.ticksToLive <= Math.min(50, newestSalesman.memory.arrived)
                        ) {
                            this.office.submit(new MinionRequest(franchise.id, 10, MinionTypes.SALESMAN, {
                                source: franchise.id,
                                ignoresRequests: true
                            }))
                        }
                    }

                })
            }
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
