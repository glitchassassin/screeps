import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { TaskRequest } from "tasks/TaskRequest";
import { BuildTask } from "tasks/types/BuildTask";
import { Manager } from "./Manager";

export class BuilderManager extends Manager {
    builders: Creep[] = [];
    sites: ConstructionSite[] = [];
    init = (room: Room) => {
        this.builders = room.find(FIND_MY_CREEPS).filter(c => c.memory.type === 'BUILDER') || null;
        this.sites = room.find(FIND_MY_CONSTRUCTION_SITES);

        // Request minions, if needed
        if (this.shouldSpawnBuilders(room)) {
            global.managers.spawn.submit(new MinionRequest(room.name, 4, MinionTypes.BUILDER))
        }

        // Request build for construction sites
        this.sites.forEach(site => {
            global.managers.task.submit(new TaskRequest(site.id, new BuildTask(null, site), 5))
        })
    }
    shouldSpawnBuilders = (room: Room) => {
        let builderCount = Math.max(
            room.find(FIND_MY_CONSTRUCTION_SITES).length / 2,
            room.find(FIND_MY_STRUCTURES).length / 8
        );
        let targetBuilders = room.controller ? Math.min(room.controller.level, builderCount) : builderCount;
        return this.builders.length < targetBuilders;
    }
}
