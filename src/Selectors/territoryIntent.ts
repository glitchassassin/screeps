import { controllerId, sourceIds } from "./roomCache";

import { roomPlans } from "./roomPlans";

export enum TerritoryIntent {
    AVOID = 'AVOID',
    ACQUIRE = 'ACQUIRE',
    DEFEND = 'DEFEND',
    EXPLOIT = 'EXPLOIT',
    IGNORE = 'IGNORE'
}

export const getTerritoryIntent = (roomName: string): TerritoryIntent => {
    let controller = controllerId(roomName);
    let roomPlan = roomPlans(roomName);
    let sources = sourceIds(roomName);
    if (!controller) {
        return TerritoryIntent.IGNORE;
    }
    if (Memory.rooms[roomName]?.owner && !Game.rooms[roomName]?.controller?.my) {
        return TerritoryIntent.AVOID;
    } else if (roomPlan?.office) {
        return TerritoryIntent.ACQUIRE;
    } else if (sources.length === 2) {
        return TerritoryIntent.EXPLOIT;
    } else {
        return TerritoryIntent.IGNORE;
    }
}
