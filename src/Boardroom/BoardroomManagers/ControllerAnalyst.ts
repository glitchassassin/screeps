import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Office } from "Office/Office";
import { ShouldReserveTerritory } from "Office/OfficeManagers/LegalManager/Strategies/ShouldReserveTerritory";
import { ControllerIntelligence } from "Office/RoomIntelligence";
import { Memoize } from "typescript-memoize";
import { MapAnalyst } from "./MapAnalyst";

export type Depot = {
    pos: RoomPosition,
    container?: StructureContainer,
    constructionSite?: ConstructionSite
}

export class ControllerAnalyst extends BoardroomManager {
    @Memoize((office: Office) => ('' + office.name + Game.time))
    calculateBestContainerLocation(office: Office) {
        let room = office.center.room;
        if (!room.controller) return null;
        let spawn = Object.values(Game.spawns).find(s => s.room === room);
        let target = (spawn? spawn.pos : room.getPositionAt(25, 25)) as RoomPosition;
        let mapAnalyst = this.boardroom.managers.get('MapAnalyst') as MapAnalyst;

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
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getDesignatedUpgradingLocations(office: Office) {
        let upgradeDepotFlag = office.center.room.find(FIND_FLAGS)
            .find(flag => flag.name === 'upgradeDepot');
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
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getReservingControllers(office: Office) {
        return office.territories
            .filter(t => ShouldReserveTerritory(t))
            .map(t => t.controller) as ControllerIntelligence[]
    }
}
