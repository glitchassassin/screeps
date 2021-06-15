import { BoardroomManager } from "Boardroom/BoardroomManager";
import { RoomData } from "WorldState/Rooms";
import { TERRITORY_RADIUS } from "config";

export class RoomAnalyst extends BoardroomManager {
    plan() {
        for (let roomName in Game.rooms) {
            let data = RoomData.byRoom(roomName) ?? { name: roomName, scanned: Game.time }
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
    }
}
