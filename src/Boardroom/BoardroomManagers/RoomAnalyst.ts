import { BoardroomManager } from "Boardroom/BoardroomManager";
import { MemoizeByTick } from "utils/memoize";
import { Office } from "Office/Office";
import { RoomData } from "WorldState/Rooms";
import { TERRITORY_RADIUS } from "config";

export class RoomAnalyst extends BoardroomManager {
    plan() {
        for (let roomName in Game.rooms) {
            let data = RoomData.byRoom(roomName) ?? { name: roomName, scanned: Game.time }
            data.scanned = Game.time;
            if (this.boardroom.offices.get(roomName) === undefined && !RoomData.byRoom(roomName)?.territoryOf) {
                let center = new RoomPosition(25, 25, roomName)
                let office = global.boardroom.getClosestOffice(center);
                if (office && roomName !== office.name && Game.map.getRoomLinearDistance(roomName, office.name) <= this.getTerritoryRadius(office)) {
                    data.territoryOf = office.name;
                    // Reset the room plan, if necessary, to force it
                    // to calculate a Territory room plan
                    data.roomPlan = undefined;
                }
            }
            RoomData.set(roomName, data);
        }
    }
    @MemoizeByTick((office: Office) => office.name)
    getTerritoryRadius(office: Office) {
        if (office.controller.level < 3) {
            return 0;
        } else {
            return TERRITORY_RADIUS;
        }
    }
}
