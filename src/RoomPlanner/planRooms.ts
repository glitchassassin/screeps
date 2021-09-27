import profiler from "utils/profiler";
import { generateRoomPlans } from "./RoomArchitect";

export const planRooms = profiler.registerFN(() => {
    let start = Game.cpu.getUsed();
    if (Game.cpu.bucket < 500) return; // Don't do room planning at low bucket levels

    Memory.roomPlans ??= {};

    for (let room in Memory.rooms) {
        if (Memory.roomPlans[room]?.complete) continue; // Already planned
        if (!Memory.rooms[room].controllerId) continue; // No controller or room hasn't been properly scanned yet
        if (Game.cpu.getUsed() - start <= 5) {
            generateRoomPlans(room);
        }
        Game.rooms[room].visual.circle
    }
}, 'planRooms')
