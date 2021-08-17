import { getHeadquarterLogisticsLocation } from "./getHqLocations";
import { roomPlans } from "./roomPlans";

export const defaultDirectionsForSpawn = (office: string, spawn: StructureSpawn) => {
    let directions = [TOP, TOP_RIGHT, RIGHT, BOTTOM_RIGHT, BOTTOM, BOTTOM_LEFT, LEFT, TOP_LEFT];
    let hqSpawn = roomPlans(office)?.headquarters?.spawn.structure
    if (hqSpawn?.id !== spawn.id) return directions;
    const avoidPos = getHeadquarterLogisticsLocation(office);
    if (!avoidPos) return directions;
    const avoidDirection = hqSpawn?.pos.getDirectionTo(avoidPos)
    return directions.filter(d => d !== avoidDirection);
}
