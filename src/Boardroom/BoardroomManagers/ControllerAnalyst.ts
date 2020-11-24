import { DefenseAnalyst, TerritoryIntent } from "./DefenseAnalyst";

import { BoardroomManager } from "Boardroom/BoardroomManager";
import { CachedController } from "WorldState";
import { LegalManager } from "Office/OfficeManagers/LegalManager";
import { MapAnalyst } from "./MapAnalyst";
import { Memoize } from "typescript-memoize";
import { Office } from "Office/Office";
import { RoomArchitect } from "./Architects/RoomArchitect";

export class ControllerAnalyst extends BoardroomManager {
    plan() {
        let roomArchitect = this.boardroom.managers.get('RoomArchitect') as RoomArchitect;
        this.boardroom.offices.forEach(office => {
            let controller = global.worldState.controllers.byRoom.get(office.name)
            if (!controller) return;
            // Initialize properties
            if (!controller.containerPos || !controller.linkPos) {
                let {container, link} = roomArchitect.headquarters.get(office.name) ?? {}
                controller.containerPos = container?.pos;
                controller.linkPos = link?.pos;
            }
        })
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getDesignatedUpgradingLocations(office: Office) {
        let controller = global.worldState.controllers.byRoom.get(office.name);
        if (!controller?.containerPos) return null;

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
