import { DefenseAnalyst, TerritoryIntent } from "Analysts/DefenseAnalyst";

import { AcquireRequest } from "BehaviorTree/requests/Acquire";
import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Controllers } from "WorldState/Controllers";
import { FacilitiesManager } from "Office/OfficeManagers/FacilitiesManager";
import { LegalManager } from "Office/OfficeManagers/LegalManager";
import { MapAnalyst } from "Analysts/MapAnalyst";
import { Office } from "Office/Office";
import { RoomData } from "WorldState/Rooms";
import { TERRITORY_RADIUS } from "config";

export class RoomAnalyst extends BoardroomManager {
    acquireRequest?: AcquireRequest;

    plan() {
        // Update RoomData with visible rooms
        for (let roomName in Game.rooms) {
            let data = RoomData.byRoom(roomName) ?? { name: roomName, scanned: Game.time }
            data.scanned = Game.time;
            if (this.boardroom.offices.get(roomName) === undefined && !RoomData.byRoom(roomName)?.territoryOf) {
                let center = new RoomPosition(25, 25, roomName)
                let office = global.boardroom.getClosestOffice(center);
                if (office && roomName !== office.name && Game.map.getRoomLinearDistance(roomName, office.name) <= TERRITORY_RADIUS) {
                    data.territoryOf = office.name;
                    // Reset the room plan, if necessary, to force it
                    // to calculate a Territory room plan
                    data.roomPlan = undefined;
                }
            }
            RoomData.set(roomName, data);
        }

        // Register new Offices, if needed
        for (let r of RoomData.all()) {
            if (Controllers.byRoom(r.name)?.my && !this.boardroom.offices.has(r.name)) {
                global.boardroom.offices.set(r.name,
                    new Office(global.boardroom, r.name)
                );
            } else if (!Controllers.byRoom(r.name)?.my && this.boardroom.offices.has(r.name)) {
                global.boardroom.offices.delete(r.name);
            }
        }

        // Select a new Office site, if appropriate
        if (Game.gcl.level > this.boardroom.offices.size && (!this.acquireRequest || this.acquireRequest.result)) {
            const office = this.boardroom.offices.values().next().value as Office;
            const site = RoomData.all()
                .filter(room => (
                    !room.territoryOf &&
                    !this.boardroom.offices.has(room.name) &&
                    DefenseAnalyst.getTerritoryIntent(room.name) === TerritoryIntent.ACQUIRE
                ))
                .sort(MapAnalyst.sortByDistanceToRoom(office.name))
                .shift();
            const controller = Controllers.byRoom(site?.name ?? '');

            if (controller) {
                // Delegate acquisition to sufficiently-leveled Office
                for (let office of this.boardroom.offices.values()) {
                    const facilitiesManager = office.managers.get('FacilitiesManager') as FacilitiesManager
                    if (office.controller.level >= 5 && facilitiesManager.workPending() === 0) {
                        const legalManager = office.managers.get('LegalManager') as LegalManager;
                        this.acquireRequest = new AcquireRequest(controller)
                        legalManager.submit(this.acquireRequest);
                        break;
                    }
                }
            }
        }
    }
}
