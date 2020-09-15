import { Analyst } from "./Analyst";
import { MapAnalyst } from "./MapAnalyst";

const mapAnalyst = new MapAnalyst();

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
    calculateBestMiningLocations = (room: Room) => {
        let locations: {pos: RoomPosition, sourceId: string}[] = [];
        let sources = room.find(FIND_SOURCES);
        let spawn = Object.values(Game.spawns).find(spawn => spawn.room === room);
        let target = (spawn? spawn.pos : room.getPositionAt(25, 25)) as RoomPosition;

        sources.forEach(source => {
            let candidate: {pos: RoomPosition, range: number}|null = (null as {pos: RoomPosition, range: number}|null);
            mapAnalyst
                .calculateAdjacentPositions(source.pos)
                .forEach((pos) => {
                    if (mapAnalyst.isPositionWalkable(pos)) {
                        let range = PathFinder.search(pos, target).cost;
                        if (!candidate || candidate.range > range) {
                            candidate = {pos, range};
                        }
                    }
                })
            if (candidate) locations.push({pos: candidate.pos, sourceId: source.id});
        })
        return locations;
    }
    getDesignatedMiningLocations = (room: Room) => {
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
    getSources = (room: Room) => {
        return room.find(FIND_SOURCES);
    }
}
