import { upgrade } from "behaviors/upgrade";
import { Analyst } from "./Analyst";
import { MapAnalyst } from "./MapAnalyst";

const mapAnalyst = new MapAnalyst();

export type Depot = {
    pos: RoomPosition,
    container?: StructureContainer,
    constructionSite?: ConstructionSite
}

export class ControllerAnalyst extends Analyst {
    calculateBestContainerLocation = (room: Room) => {
        if (!room.controller) return null;
        let spawn = Object.values(Game.spawns).find(spawn => spawn.room === room);
        let target = (spawn? spawn.pos : room.getPositionAt(25, 25)) as RoomPosition;

        let candidate: {pos: RoomPosition, range: number}|null = (null as {pos: RoomPosition, range: number}|null);
        mapAnalyst
            .calculateNearbyPositions(room.controller.pos, 3)
            .forEach((pos) => {
                if (mapAnalyst.isPositionWalkable(pos)) {
                    let range = PathFinder.search(pos, target).cost;
                    if (!candidate || candidate.range > range) {
                        candidate = {pos, range};
                    }
                }
            });
        return candidate?.pos;
    }
    getDesignatedUpgradingLocations = (room: Room) => {
        let upgradeDepotFlag = Object.values(Game.flags)
            .find(flag => flag.memory.upgradeDepot);
        if (!upgradeDepotFlag) return null;
        let depot: Depot = {
            pos: upgradeDepotFlag.pos
        }
        upgradeDepotFlag.pos.look().forEach(obj => {
            if (obj.type === LOOK_STRUCTURES && obj.structure?.structureType === STRUCTURE_CONTAINER) {
                depot.container = obj.structure as StructureContainer
            } else if (obj.type === LOOK_CONSTRUCTION_SITES && obj.constructionSite?.structureType === STRUCTURE_CONTAINER) {
                depot.constructionSite = obj.constructionSite as ConstructionSite
            }
        });
        return depot;
    }
}
