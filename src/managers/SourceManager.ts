import { Mine, SourceAnalyst } from "analysts/SourceAnalyst";
import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { Task } from "tasks/Task";
import { HarvestTask } from "tasks/types/HarvestTask";
import { TravelTask } from "tasks/types/TravelTask";
import { Manager } from "./Manager";

const sourceAnalyst = new SourceAnalyst();

export class SourceManager extends Manager {
    mines: Mine[] = [];
    init = (room: Room) => {
        this.mines = sourceAnalyst.getDesignatedMiningLocations(room);

        // Request minions, if needed
        this.mines.forEach((mine) => {
            if (!mine.miner) {
                global.managers.spawn.submit(new MinionRequest(mine.id, 5, MinionTypes.MINER, {
                    source: mine.id
                }))
            }
        })
    }
    run = (room: Room) => {
        this.mines.forEach(mine => {
            if (!mine.source) return;
            if (mine.miner && global.managers.task.isIdle(mine.miner)) {
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
                    global.managers.task.assign(new Task(new HarvestTask(mine.source), mine.miner));
                } else {
                    // If miner is not on site, go there
                    global.managers.task.assign(new Task(new TravelTask(mine.pos), mine.miner));
                }
            }
        })
    }
}
