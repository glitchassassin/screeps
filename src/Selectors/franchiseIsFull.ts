import { MissionType } from "Missions/Mission";
import { memoizeByTick } from "utils/memoizeFunction";
import { adjacentWalkablePositions } from "./MapCoordinates";
import { posById } from "./posById";

export const franchiseIsFull = memoizeByTick(
    (office, id) => office + id,
    (office: string, id: Id<Source>) => {
        const pos = posById(id);
        const missions = Memory.offices[office]?.activeMissions.filter(m => m.type === MissionType.HARVEST && m.data.source === id) ?? [];
        const assignedParts = missions.flatMap(m => m.creepNames.map(n => Game.creeps[n])).reduce((sum, creep) => sum + (creep?.getActiveBodyparts(WORK) ?? 0), 0);
        if (id && assignedParts >= 5) return true;
        if (!pos || !Game.rooms[pos.roomName]) return false; // Can't find the source, don't know if it's full

        return adjacentWalkablePositions(pos, false).length === 0;
    }
)
