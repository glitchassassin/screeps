import { Mine, SourceAnalyst } from "analysts/SourceAnalyst";
import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { Request } from "requests/Request";
import { FulfillEnergyRequestTask } from "tasks/types/FulfillEnergyRequestTask";
import { HarvestTask } from "tasks/types/HarvestTask";
import { TravelTask } from "tasks/types/TravelTask";
import { Manager } from "./Manager";
import { TaskManager } from "./TaskManager";
import { RequestManager } from "./RequestManager";

const sourceAnalyst = new SourceAnalyst();

export class SourceManager extends Manager {
    constructor(
        private taskManager: TaskManager,
        private requestManager: RequestManager
    ) { super(); }
    mines: Mine[] = [];
    init = (room: Room) => {
        this.mines = sourceAnalyst.getDesignatedMiningLocations(room);

        // Request minions, if needed
        this.mines.forEach((mine) => {
            if (!mine.miner) {
                this.requestManager.submit(new MinionRequest(mine.id, MinionTypes.MINER, {
                    source: mine.id
                }))
            }
        })
    }
    run = (room: Room) => {
        this.mines.forEach(mine => {
            if (!mine.source) return;
            if (mine.miner && this.taskManager.isIdle(mine.miner)) {
                if (mine.minerOnSite) {
                    // If miner is full, and mine container exists, deposit there;
                    // otherwise, remain idle
                    if (mine.miner.store[RESOURCE_ENERGY] > 0 && mine.miner.store.getFreeCapacity() === 0) {
                        // Miner is full
                        if (!mine.container?.store.getFreeCapacity() || mine.miner.transfer(mine.container, RESOURCE_ENERGY) !== OK) {
                            // Failed to transfer to container; remain idle.
                            console.log(`[${mine.miner.name}] Idling`)
                            return
                        }
                    }
                    // If miner is not full, continue harvesting
                    this.taskManager.assign(new HarvestTask(mine.miner, mine.source));
                } else {
                    // If miner is not on site, go there
                    this.taskManager.assign(new TravelTask(mine.miner, mine.pos));
                }
            }
        })
    }
}
