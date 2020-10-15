import { TerritoryIntelligence } from "Office/RoomIntelligence";

export const ShouldReserveTerritory = (territory: TerritoryIntelligence) => {
    if (territory.hostileMinions) return false;
    if (!territory.controller.pos) return false;
    if (territory.sources.size <= 1) return false;
    if (territory.controller.my) return false;
    return true;
}
