import { BoardroomManager } from "Boardroom/BoardroomManager";
import { CachedController } from "WorldState";
import { ControllerIntelligence } from "Office/RoomIntelligence";
import { MapAnalyst } from "./MapAnalyst";
import { Memoize } from "typescript-memoize";
import { Office } from "Office/Office";
import { ShouldReserveTerritory } from "Office/OfficeManagers/LegalManager/Strategies/ShouldReserveTerritory";

export class ControllerAnalyst extends BoardroomManager {
    plan() {
        this.boardroom.offices.forEach(office => {
            let territories = [office.center, ...office.territories]
            // If necessary, add franchise locations for territory
            for (let t of territories) {
                let controller = this.worldState.controllers.byRoom.get(t.name)
                if (!controller) continue;
                // Initialize properties
                if (!controller.containerPos) {
                    controller.containerPos = this.calculateBestContainerLocation(office)
                }
            }
        })
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    calculateBestContainerLocation(office: Office) {
        let room = office.center.room;
        let controller = this.worldState.controllers.byRoom.get(room.name);
        if (!controller) return undefined;
        // Pick the first spawn in the room
        let spawn = this.worldState.mySpawns.byRoom.get(room.name)?.values().next().value;
        let target = (spawn? spawn.pos : room.getPositionAt(25, 25)) as RoomPosition;
        let mapAnalyst = this.boardroom.managers.get('MapAnalyst') as MapAnalyst;

        let candidate: {pos: RoomPosition, range: number}|undefined = undefined as {pos: RoomPosition, range: number}|undefined;
        mapAnalyst
            .calculateNearbyPositions(controller.pos, 3)
            .forEach((pos) => {
                if (mapAnalyst.isPositionWalkable(pos) && !pos.isNearTo(target)) {
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
        let room = office.center.room;
        let controller = this.worldState.controllers.byRoom.get(room.name);
        if (!controller?.containerPos) return null;

        // If we don't have a container/construction site cached, look for one
        if (!controller.containerId && !controller.constructionSiteId) {
            controller.containerPos.look().forEach(obj => {
                if (obj.type === LOOK_STRUCTURES && obj.structure?.structureType === STRUCTURE_CONTAINER) {
                    (controller as CachedController).containerId = obj.structure.id as Id<StructureContainer>;
                } else if (obj.type === LOOK_CONSTRUCTION_SITES && obj.constructionSite?.structureType === STRUCTURE_CONTAINER) {
                    (controller as CachedController).constructionSiteId = obj.constructionSite.id as Id<ConstructionSite>;
                }
            });
        }

        return controller;
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getReservingControllers(office: Office) {
        return office.territories
            .filter(t => ShouldReserveTerritory(t))
            .map(t => t.controller) as ControllerIntelligence[]
    }
}
