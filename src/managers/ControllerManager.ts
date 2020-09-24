import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { Manager } from "./Manager";
import { UpgradeTask } from "tasks/types/UpgradeTask";
import { WithdrawTask } from "tasks/types/WithdrawTask";
import { TaskRequest } from "tasks/TaskRequest";
import { Task } from "tasks/Task";
import { TransferTask } from "tasks/types/TransferTask";
import { TravelTask } from "tasks/types/TravelTask";

export class ControllerManager extends Manager {
    upgraders: Creep[] = [];
    init = (room: Room) => {
        if (!room.controller) return; // Nothing to manage in this room

        this.upgraders = room.find(FIND_MY_CREEPS).filter(c => c.memory.type === 'UPGRADER');

        // Request minions, if needed
        let depot = global.analysts.controller.getDesignatedUpgradingLocations(room);
        let minimumUpgraderCount = 1;
        if (this.upgraders.length < minimumUpgraderCount) {
            global.supervisors[room.name].spawn.submit(new MinionRequest(room.controller.id, 4, MinionTypes.UPGRADER))
            // Request energy, if no dedicated upgraders
            global.supervisors[room.name].task.submit(new TaskRequest(
                room.controller.id,
                new UpgradeTask(room.controller),
                1,
                (room.controller.level === 8 ? 15 : 1000) // TODO: Cap of 15 energy per tick at RCL 8, this is capacity per task
            ));
        } else {
            if (Game.time % 50 === 0 && global.analysts.statistics.metrics[room.name].controllerDepotFillRate.mean() > 0) {
                // More input than output: spawn more upgraders
                global.supervisors[room.name].spawn.submit(new MinionRequest(room.controller.id, 4, MinionTypes.UPGRADER))
            }
        }
    }
    run = (room: Room) => {
        if (!room.controller || this.upgraders.length === 0) return;
        this.upgraders.forEach(upgrader => {
            if (global.supervisors[room.name].task.isIdle(upgrader)) {
                if(upgrader.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    // Upgrader has energy - dump it into controller
                    global.supervisors[room.name].task.assign(new Task([
                        new TravelTask((room.controller as StructureController).pos, 3),
                        new UpgradeTask(room.controller)
                    ], upgrader, room.name));
                } else {
                    // Upgrader needs energy - get from controller container, preferably
                    let depot = global.analysts.controller.getDesignatedUpgradingLocations(room);
                    if (depot && depot.container) {
                        global.supervisors[room.name].task.assign(new Task([
                            new TravelTask(depot.container.pos, 1),
                            new WithdrawTask(depot.container)
                        ], upgrader, room.name));
                    } else {
                        // No upgrader depot exists yet; see if there's a spawn we can withdraw from instead
                        let spawn = global.analysts.spawn.getSpawns(room).find(s => s.store.getUsedCapacity(RESOURCE_ENERGY) > 0);
                        if (spawn) {
                            global.supervisors[room.name].task.assign(new Task([
                                new TravelTask(spawn.pos, 1),
                                new WithdrawTask(spawn)
                            ], upgrader, room.name));
                        }
                    }
                }
            }
        })
    }
}
