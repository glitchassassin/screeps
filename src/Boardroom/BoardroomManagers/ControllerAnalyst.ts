import { DefenseAnalyst, TerritoryIntent } from "./DefenseAnalyst";

import { BoardroomManager } from "Boardroom/BoardroomManager";
import { CachedController } from "WorldState";
import { LegalManager } from "Office/OfficeManagers/LegalManager";
import { MapAnalyst } from "./MapAnalyst";
import { Memoize } from "typescript-memoize";
import { Office } from "Office/Office";

export class ControllerAnalyst extends BoardroomManager {
    plan() {
        this.boardroom.offices.forEach(office => {
            let controller = global.worldState.controllers.byRoom.get(office.name)
            if (!controller) return;
            // Initialize properties
            if (!controller.containerPos) {
                let {container, link} = this.calculateBestUpgradeLocation(office);
                controller.containerPos = container;
            }
        })
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    calculateBestUpgradeLocation(office: Office) {
        // let room = office.center.room;
        let controller = global.worldState.controllers.byRoom.get(office.name);
        if (!controller) return {};
        // Pick the first spawn in the room
        let spawn = global.worldState.mySpawns.byRoom.get(office.name)?.values().next().value;
        let target = (spawn? spawn.pos : new RoomPosition(25, 25, office.name)) as RoomPosition;
        let mapAnalyst = this.boardroom.managers.get('MapAnalyst') as MapAnalyst;

        let containerPos: {pos: RoomPosition, range: number}|undefined = undefined as {pos: RoomPosition, range: number}|undefined;
        let linkPos: {pos: RoomPosition, range: number}|undefined = undefined as {pos: RoomPosition, range: number}|undefined;
        mapAnalyst
            .calculateNearbyPositions(controller.pos, 3)
            .forEach((pos) => {
                if (mapAnalyst.isPositionWalkable(pos) && !pos.isNearTo(target)) {
                    let range = PathFinder.search(pos, target).cost;
                    if (!containerPos || containerPos.range > range) {
                        linkPos = containerPos;
                        containerPos = {pos, range};
                    }
                }
            });
        return {
            container: containerPos?.pos,
            link: linkPos?.pos
        }
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getDesignatedUpgradingLocations(office: Office) {
        let controller = global.worldState.controllers.byRoom.get(office.name);
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
        let mapAnalyst = this.boardroom.managers.get('MapAnalyst') as MapAnalyst;
        let defenseAnalyst = this.boardroom.managers.get('DefenseAnalyst') as DefenseAnalyst;
        let territories = mapAnalyst.calculateNearbyRooms(office.name, 1);
        let controllers: CachedController[] = [];
        for (let t of territories) {
            let intent = defenseAnalyst.getTerritoryIntent(t)
            if (intent === TerritoryIntent.EXPLOIT) {
                let controller = global.worldState.controllers.byRoom.get(t);
                if (controller) {
                    controllers.push(controller);
                }
            }
        }
        return controllers;
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    unassignedUpgradeRequests(office: Office) {
        return (office.managers.get('LegalManager') as LegalManager).requests.filter(r => {
            return r.assigned.length === 0
        });
    }
}
