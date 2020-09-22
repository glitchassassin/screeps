import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { Manager } from "./Manager";
import { UpgradeTask } from "tasks/types/UpgradeTask";
import { WithdrawTask } from "tasks/types/WithdrawTask";
import { TaskRequest } from "tasks/TaskRequest";
import { Task } from "tasks/Task";
import { TransferTask } from "tasks/types/TransferTask";

export class ControllerManager extends Manager {
    upgraders: Creep[] = [];
    init = (room: Room) => {
        if (!room.controller) return; // Nothing to manage in this room

        this.upgraders = room.find(FIND_MY_CREEPS).filter(c => c.memory.type === 'UPGRADER');

        // Request minions, if needed
        if (this.upgraders.length < (room.controller.level/2)) {
            global.supervisors[room.name].spawn.submit(new MinionRequest(room.controller.id, 4, MinionTypes.UPGRADER))
            // Request energy, if no dedicated upgraders
            global.supervisors[room.name].task.submit(new TaskRequest(
                room.controller.id,
                new UpgradeTask(room.controller),
                1,
                (room.controller.level === 8 ? 15 : 1000) // TODO: Cap of 15 energy per tick at RCL 8, this is capacity per task
            ));
        }
        // Request energy to controller depot, if needed
        // let depot = global.analysts.controller.getDesignatedUpgradingLocations(room);
        // if (depot?.container?.store && depot.container.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        //     global.supervisors[room.name].task.submit(new TaskRequest(room.name, new TransferTask(depot.container), 5));
        // }
    }
    run = (room: Room) => {
        if (!room.controller || this.upgraders.length === 0) return;
        this.upgraders.forEach(upgrader => {
            if (global.supervisors[room.name].task.isIdle(upgrader)) {
                if(upgrader.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    // Upgrader has energy - dump it into controller
                    global.supervisors[room.name].task.assign(new Task([new UpgradeTask(room.controller)], upgrader, room.name));
                } else {
                    // Upgrader needs energy - get from controller container, preferably
                    let depot = global.analysts.controller.getDesignatedUpgradingLocations(room);
                    if (depot && depot.container) {
                        global.supervisors[room.name].task.assign(new Task([new WithdrawTask(depot.container)], upgrader, room.name));
                    } else {
                        // No upgrader depot exists yet; see if there's a spawn we can withdraw from instead
                        let spawn = global.analysts.spawn.getSpawns(room).find(s => s.energy > 0);
                        if (spawn) {
                            global.supervisors[room.name].task.assign(new Task([new WithdrawTask(spawn.spawn)], upgrader, room.name));
                        }
                    }
                }
            }
        })
    }
}
