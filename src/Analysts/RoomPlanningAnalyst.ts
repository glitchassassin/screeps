import { MemoizeByTick } from "utils/memoize";
import { RoomArchitect } from "Boardroom/BoardroomManagers/Architects/RoomArchitect";

export class RoomPlanningAnalyst {
    @MemoizeByTick((roomName: string) => roomName)
    static getRoomPlan(roomName: string) {
        const roomArchitect = global.boardroom.managers.get('RoomArchitect') as RoomArchitect;
        const plan = roomArchitect.roomPlans.get(roomName);
        if (plan && plan.structures.length > 0) {
            return plan;
        }
        return;
    }
    @MemoizeByTick((roomName: string) => roomName)
    static getHeadquartersPlan(roomName: string) {
        const roomArchitect = global.boardroom.managers.get('RoomArchitect') as RoomArchitect;
        return roomArchitect.headquarters.get(roomName);
    }
    @MemoizeByTick((roomName: string) => roomName)
    static getOfficeRoomPlan(roomName: string) {
        const roomArchitect = global.boardroom.managers.get('RoomArchitect') as RoomArchitect;
        const plan = roomArchitect.roomPlans.get(roomName);
        if (plan && plan.structures.some(s => s.structureType === STRUCTURE_SPAWN)) {
            return plan;
        }
        return;
    }
}
