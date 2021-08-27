import { memoizeByTick } from "utils/memoizeFunction";
import { getTowerRefillerLocation } from "./getHqLocations";
import { roomPlans } from "./roomPlans";

export const defaultDirectionsForSpawn = memoizeByTick(
    (office: string, spawn: StructureSpawn) => office + spawn.id,
    (office: string, spawn: StructureSpawn) => {
        let directions = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
        let hqSpawn = roomPlans(office)?.headquarters?.spawn.structure
        if (hqSpawn?.id !== spawn.id) return directions;
        const avoidPos = getTowerRefillerLocation(office);
        if (!avoidPos) return directions;
        const avoidDirection = hqSpawn?.pos.getDirectionTo(avoidPos)
        return directions.filter(d => d !== avoidDirection);
    }
)
