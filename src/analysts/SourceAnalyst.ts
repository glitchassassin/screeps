
import { MinerMinion } from "requests/types/minions/MinerMinion";
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
        let locations: {source: Source, route: PathFinderPath}[] = [];
        let sources = room.find(FIND_SOURCES);
        let spawn = Object.values(Game.spawns).find(spawn => spawn.room === room);
        let target = (spawn? spawn.pos : room.getPositionAt(25, 25)) as RoomPosition;

        sources.map(source => {
            let route = PathFinder.search(source.pos, target);
            if (route) locations.push({source, route});
            return {
                source,
                route
            }
        })
        // Sorted by distance from spawn
        return locations.sort((a, b) => (a.route.cost - b.route.cost)).map(s => ({
            pos: s.route.path[0],
            sourceId: s.source.id
        }));
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
            if (source.pos.findInRange(FIND_CREEPS, 1)
                .reduce((a, b) => (a + b.getActiveBodyparts(WORK) * 2), 0) >= 10) {
                // Adjacent creeps have enough WORK parts to tap the source
                return false;
            } else if (global.analysts.map.calculateAdjacentPositions(source.pos)
                             .filter(pos => global.analysts.map.isPositionWalkable(pos)).length === 0) {
                return false;
            }
            return true;
        })
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getMaxEffectiveInput(room: Room) {
        let minionWorkParts = new MinerMinion().scaleMinion(room.energyCapacityAvailable)
                                               .filter(p => p === WORK).length;

        // Max energy output per tick
        return 2 * this.getSources(room).reduce((sum, source) => (
            sum + Math.max(
                5,
                minionWorkParts * global.analysts.map.calculateAdjacentPositions(source.pos)
                                        .filter(pos => global.analysts.map.isPositionWalkable(pos)).length
            )),
        0)
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getMinimumMiners(room: Room) {
        let minionWorkParts = new MinerMinion().scaleMinion(room.energyCapacityAvailable)
                                               .filter(p => p === WORK).length;

        // Theoretical minimum number of miners to max out all sources, working simultaneously
        return this.getSources(room).reduce((sum, source) => (
            sum + Math.max(
                5,
                Math.max(
                    global.analysts.map.calculateAdjacentPositions(source.pos)
                          .filter(pos => global.analysts.map.isPositionWalkable(pos)).length,
                    Math.ceil(5 / minionWorkParts)
                )
            )),
        0)
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getPioneers(room: Room) {
        return room.find(FIND_MY_CREEPS).filter(c => c.memory.type === 'PIONEER')
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getMiners(room: Room) {
        return room.find(FIND_MY_CREEPS).filter(c => c.memory.type === 'MINER')
    }
}
