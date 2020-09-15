import { BuildRequest } from "requests/types/BuildRequest";
import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { Manager } from "./Manager";

export class BuilderManager extends Manager {
    builders: Creep[] = [];
    sites: ConstructionSite[] = [];
    init = (room: Room) => {
        if (!room.controller) return; // Nothing to manage in this room

        this.builders = room.find(FIND_MY_CREEPS).filter(c => c.memory.type === 'BUILDER') || null;
        this.sites = room.find(FIND_MY_CONSTRUCTION_SITES);

        // Request minions, if needed
        if (this.shouldSpawnBuilders(room)) {
            global.managers.request.submit(new MinionRequest(room.controller.id, 4, MinionTypes.BUILDER))
        }

        // Request build for construction sites
        this.sites.forEach(site => {
            global.managers.request.submit(new BuildRequest(site.id, 5, site))
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
