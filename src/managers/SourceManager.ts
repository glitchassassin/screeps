import { Mine, SourceAnalyst } from "analysts/SourceAnalyst";
import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { Task } from "tasks/Task";
import { HarvestTask } from "tasks/types/HarvestTask";
import { TravelTask } from "tasks/types/TravelTask";
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
                    global.supervisors[room.name].spawn.submit(new MinionRequest(mine.id, 10, MinionTypes.PIONEER, {
                        source: mine.id
                    }))
                } else {
                    // Spawn dedicated miner
                    global.supervisors[room.name].spawn.submit(new MinionRequest(mine.id, 10, MinionTypes.MINER, {
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
            if (mine.miner && global.supervisors[room.name].task.isIdle(mine.miner)) {
                // If miner is not at mine site, go there
                if (!mine.miner.pos.isEqualTo(mine.pos)) {
                    global.supervisors[room.name].task.assign(new Task([new TravelTask(mine.pos, 0)], mine.miner, mine.id));
                }
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
                global.supervisors[room.name].task.assign(new Task([new HarvestTask(mine.source)], mine.miner, mine.id));
            }
        })
    }
}
