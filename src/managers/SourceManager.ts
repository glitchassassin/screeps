import { Mine, SourceAnalyst } from "analysts/SourceAnalyst";
import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { Task } from "tasks/Task";
import { HarvestTask } from "tasks/types/HarvestTask";
import { Manager } from "./Manager";

export class SourceManager extends Manager {
    mines: Mine[] = [];
    init = (room: Room) => {
        this.mines = global.analysts.source.getDesignatedMiningLocations(room);

        // Request minions, if needed
        this.mines.forEach((mine) => {
            if (!mine.miner) {
                if (!mine.container) {
                    // Spawn miner/hauler
                    global.supervisors.spawn.submit(new MinionRequest(mine.id, 5, MinionTypes.PIONEER, {
                        source: mine.id
                    }))
                } else {
                    // Spawn dedicated miner
                    global.supervisors.spawn.submit(new MinionRequest(mine.id, 5, MinionTypes.MINER, {
                        source: mine.id,
                        ignoresRequests: true
                    }))
                }
            }
        })
    }
    run = (room: Room) => {
        this.mines.forEach(mine => {
            if (!mine.source) return;
            if (mine.miner && global.supervisors.task.isIdle(mine.miner)) {
                // If miner is full, and mine container exists, deposit there;
                // otherwise, remain idle
                if (mine.miner.store[RESOURCE_ENERGY] > 0 && mine.miner.store.getFreeCapacity() === 0) {
                    // Miner is full
                    if (!mine.container?.store.getFreeCapacity() || mine.miner.transfer(mine.container, RESOURCE_ENERGY) !== OK) {
                        // Failed to transfer to container; remain idle.
                        console.log(`[${mine.miner.name}] Container full, idling`);
                        return
                    }
                }
                // If miner is not full, continue harvesting
                global.supervisors.task.assign(new Task([new HarvestTask(mine.source)], mine.miner, mine.id));
            }
        })
    }
}
