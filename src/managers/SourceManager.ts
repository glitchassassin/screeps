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
                if (mine.miners.length === 0) {
                    global.supervisors[room.name].spawn.submit(new MinionRequest(mine.id, 10, MinionTypes.MINER, {
                        source: mine.id,
                        ignoresRequests: true
                    }))
                }
                mine.miners.forEach(miner => {
                    if (miner.ticksToLive &&
                        miner.memory.arrived &&
                        miner.ticksToLive <= miner.memory.arrived
                    ) {
                        global.supervisors[room.name].spawn.submit(new MinionRequest(mine.id, 10, MinionTypes.MINER, {
                            source: mine.id,
                            ignoresRequests: true
                        }))
                    }
                })
            })
        } else {
            // Otherwise, just keep spawning pioneer minions
            global.supervisors[room.name].spawn.submit(new MinionRequest(`${room.name}_SourceManager`, 10, MinionTypes.PIONEER, {}))
        }
    }
    run = (room: Room) => {
        this.mines.forEach(mine => {
            if (!mine.source) return;
            mine.miners.forEach(miner => {
                if (global.supervisors[room.name].task.isIdle(miner)) {
                    // If miner is not at mine site, go there
                    if (!miner.pos.isEqualTo(mine.pos)) {
                        global.supervisors[room.name].task.assign(new Task([new TravelTask(mine.pos, 0)], miner, mine.id));
                    } else {
                        if (miner.memory.spawned && !miner.memory.arrived) {
                            miner.memory.arrived = Game.time - miner.memory.spawned;
                        }
                    }
                    // If mine container is not full, keep mining
                    if (mine.container?.store.getFreeCapacity() !== 0) {
                        global.supervisors[room.name].task.assign(new Task([new HarvestTask(mine.source)], miner, mine.id));
                    }
                }
            })
        })
    }
}
