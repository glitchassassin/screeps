import { TerritoryIntelligence } from "Office/RoomIntelligence";

export const ShouldDefendRoom = (territory: TerritoryIntelligence) => {
    return !!(
        territory.controller.my ||
        territory.controller.owner === undefined ||
        (
            territory.controller.level &&
            territory.controller.level < 3 &&
            (territory.hostileSpawns > 0 || territory.hostileMinions > 0)
        )
    )
}
