import { TerritoryIntent, getTerritoryIntent } from "./territoryIntent"

import { TERRITORY_RADIUS } from "config"
import { calculateNearbyRooms } from "./MapCoordinates"
import { sourceIds } from "./roomCache"

export const remoteFranchises = (office: string) => {
    return calculateNearbyRooms(office, TERRITORY_RADIUS, false)
        .filter(room => {
            return (
                getTerritoryIntent(room) === TerritoryIntent.EXPLOIT
            )
        })
        .flatMap(room => sourceIds(room))
}
