import { Analyst } from "./Analyst";
import { MapAnalyst } from "./MapAnalyst";

const mapAnalyst = new MapAnalyst();

export type Mine = {
    pos: RoomPosition,
    container?: StructureContainer,
    constructionSite?: ConstructionSite
}

export class SourceAnalyst extends Analyst {
    calculateViableMiningLocations = (room: Room) => {
        let locations: RoomPosition[] = [];
        let sources = room.find(FIND_SOURCES);
        sources.forEach(source => {
            let candidate = mapAnalyst
                .calculateAdjacentPositions(source.pos)
                .find(mapAnalyst.isPositionWalkable)
            if (candidate) locations.push(candidate);
        })
        return locations;
    }
    getDesignatedMiningLocations = (room: Room) => {
        return Object.values(Game.flags)
            .filter(flag => flag.memory.source)
            .map(flag => {
                let mine: Mine = {
                    pos: flag.pos
                }
                flag.pos.look().forEach(obj => {
                    if (obj.type === LOOK_STRUCTURES && obj.structure?.structureType === STRUCTURE_CONTAINER) {
                        mine.container = obj.structure as StructureContainer
                    } else if (obj.type === LOOK_CONSTRUCTION_SITES && obj.constructionSite?.structureType === STRUCTURE_CONTAINER) {
                        mine.constructionSite = obj.constructionSite as ConstructionSite
                    }
                });
                return mine;
            });
    }
    getSources = (room: Room) => {
        return room.find(FIND_SOURCES);
    }
}
