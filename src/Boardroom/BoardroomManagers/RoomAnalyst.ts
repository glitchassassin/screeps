import { BoardroomManager } from "Boardroom/BoardroomManager";
import { RoomData } from "WorldState/Rooms";

export class RoomAnalyst extends BoardroomManager {
    plan() {
        for (let roomName in Game.rooms) {
            let data = RoomData.byRoom(roomName) ?? { name: roomName, scanned: Game.time }
            RoomData.set(roomName, data);
        }
    }
}
