import { MinionRequest, MinionTypes } from "requests/types/MinionRequest";
import { TaskRequest } from "tasks/TaskRequest";
import { BuildTask } from "tasks/types/BuildTask";
import { RepairTask } from "tasks/types/RepairTask";
import { getBuildEnergyRemaining, getRepairEnergyRemaining } from "utils/gameObjectSelectors";
import { Manager } from "./Manager";

export class BuilderManager extends Manager {
    builders: Creep[] = [];
    structures: Structure[] = [];
    sites: ConstructionSite[] = [];
    init = (room: Room) => {
        this.builders = room.find(FIND_MY_CREEPS).filter(c => c.memory.type === 'BUILDER') || null;
        this.sites = room.find(FIND_MY_CONSTRUCTION_SITES);
        this.structures = room.find(FIND_STRUCTURES);

        // Request minions, if needed
        if (this.shouldSpawnBuilders(room)) {
            global.supervisors.spawn.submit(new MinionRequest(room.name, 4, MinionTypes.BUILDER))
        }

        // Request build for construction sites
        this.sites.forEach(site => {
            global.supervisors.task.submit(new TaskRequest(site.id, new BuildTask(site), 5, getBuildEnergyRemaining(site)))
        })

        // Request repair for structures in need
        this.structures
            .filter(structure => structure.structureType !== STRUCTURE_WALL)
            .sort((a, b) => (a.hits - b.hits))
            .slice(0,5) // Get top 5
            .forEach((structure, i) => {
                global.supervisors.task.submit(new TaskRequest(`${room.name}_repair_${i}`, new RepairTask(structure), 5, getRepairEnergyRemaining(structure)))
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
