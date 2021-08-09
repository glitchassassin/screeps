import profiler from "screeps-profiler";
import { generateRoomPlans } from "./RoomArchitect";

export const planRooms = profiler.registerFN(() => {
    let start = Game.cpu.getUsed();
    if (Game.cpu.bucket < 500) return; // Don't do room planning at low bucket levels

    Memory.roomPlans ??= {};

    for (let room in Memory.rooms) {
        if (Memory.roomPlans[room] !== undefined) continue; // Already planned
        if (Game.cpu.getUsed() - start <= 5) {
            generateRoomPlans(room);
        }
    }
}, 'planRooms')
