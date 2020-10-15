import { TerritoryIntelligence } from "Office/RoomIntelligence";

export const ShouldDefendRoom = (territory: TerritoryIntelligence) => {
    let hostile = territory.hostileMinions > 0 || territory.hostileStructures > 0
    if (!hostile) return false;
    if (territory.controller.my) return true;
    if (territory.controller.owner === undefined) return true;
    if ((territory.controller.level === undefined || territory.controller.level < 3)) return true;
    return false;
}
