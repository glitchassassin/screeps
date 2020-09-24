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

        // Do we have dedicated mine containers set up yet?
        if (this.mines.length > 0 && this.mines.every(mine => mine.container)) {
            // If so, make sure we have dedicated miners spawned
            this.mines.forEach(mine => {
                if (!mine.miner) {
                    global.supervisors[room.name].spawn.submit(new MinionRequest(mine.id, 10, MinionTypes.MINER, {
                        source: mine.id,
                        ignoresRequests: true
                    }))
                }
            })
        } else {
            // Otherwise, just keep spawning pioneer minions
            global.supervisors[room.name].spawn.submit(new MinionRequest(`${room.name}_SourceManager`, 10, MinionTypes.PIONEER, {}))
        }
    }
    run = (room: Room) => {
        this.mines.forEach(mine => {
            if (!mine.source) return;
            if (mine.miner && global.supervisors[room.name].task.isIdle(mine.miner)) {
                // If miner is not at mine site, go there
                if (!mine.miner.pos.isEqualTo(mine.pos)) {
                    global.supervisors[room.name].task.assign(new Task([new TravelTask(mine.pos, 0)], mine.miner, mine.id));
                }
                // If mine container is not full, keep mining
                if (mine.container?.store.getFreeCapacity() !== 0) {
                    global.supervisors[room.name].task.assign(new Task([new HarvestTask(mine.source)], mine.miner, mine.id));
                }
            }
        })
    }
}
