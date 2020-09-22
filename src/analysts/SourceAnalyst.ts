
import { Memoize } from "typescript-memoize";
import { Analyst } from "./Analyst";
import { MapAnalyst } from "./MapAnalyst";

export type Mine = {
    pos: RoomPosition,
    id: string,
    source?: Source,
    container?: StructureContainer,
    constructionSite?: ConstructionSite,
    miner?: Creep
    minerOnSite?: boolean
}

export class SourceAnalyst extends Analyst {
    @Memoize((container: StructureContainer) => ('' + container.id + Game.time))
    isMineContainer(container: StructureContainer) {
        return this.getDesignatedMiningLocations(container.room).some(mine => mine.container === container)
    }
    @Memoize((room: Room) => ('' + room.name))
    calculateBestMiningLocations(room: Room) {
        let locations: {pos: RoomPosition, sourceId: string}[] = [];
        let sources = room.find(FIND_SOURCES);
        let spawn = Object.values(Game.spawns).find(spawn => spawn.room === room);
        let target = (spawn? spawn.pos : room.getPositionAt(25, 25)) as RoomPosition;

        sources.forEach(source => {
            let route = PathFinder.search(source.pos, target);
            if (route) locations.push({pos: route.path[0], sourceId: source.id});
        })
        return locations;
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getDesignatedMiningLocations(room: Room) {
        let miners = room.find(FIND_MY_CREEPS)
        .filter(creep => creep.memory.source)
        return Object.values(Game.flags)
        .filter(flag => flag.memory.source)
        .map(flag => {
            let mine: Mine = {
                pos: flag.pos,
                id: (flag.memory.source as string),
                source: Game.getObjectById(flag.memory.source as Id<Source>) || undefined,
                miner: miners.find(m => m.memory.source === flag.memory.source)
            }
            mine.minerOnSite = false;
            flag.pos.look().forEach(obj => {
                if (obj.type === LOOK_STRUCTURES && obj.structure?.structureType === STRUCTURE_CONTAINER) {
                    mine.container = obj.structure as StructureContainer
                } else if (obj.type === LOOK_CONSTRUCTION_SITES && obj.constructionSite?.structureType === STRUCTURE_CONTAINER) {
                    mine.constructionSite = obj.constructionSite as ConstructionSite
                } else if (mine.miner && obj.type === LOOK_CREEPS && obj.creep?.id === mine.miner.id) {
                    mine.minerOnSite = true;
                }
            });
            return mine;
        });
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getSources (room: Room) {
        return room.find(FIND_SOURCES);
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getUntappedSources(room: Room) {
        return this.getSources(room).filter(source => {
            // Assume all creeps adjacent to a source are actively working it
            source.pos.findInRange(FIND_CREEPS, 1)
                .reduce((a, b) => (a + b.getActiveBodyparts(WORK) * 2), 0)
        })
    }
}
