import { TERRITORY_RADIUS } from "config";
import { calculateNearbyRooms } from "./MapCoordinates";
import { getTerritoryIntent, TerritoryIntent } from "./territoryIntent";

const officeTerritoryMap = new Map<string, string[]>();
let lastProcessedOffices = '';

export const getTerritoriesByOffice = () => {
    let territories: string[] = [];
    const offices = Object.keys(Memory.offices);
    const processedOffices = offices.join('-');
    if (lastProcessedOffices === processedOffices) return officeTerritoryMap;

    // Cache no longer valid, recalculate
    const candidates = new Map<string, string[]>();
    for (const office of offices) {
        officeTerritoryMap.set(office, []);
        // Add surrounding rooms to the list of potential territories
        territories = territories.concat(calculateNearbyRooms(office, TERRITORY_RADIUS, false)
            .filter(room => {
                return (
                    (getTerritoryIntent(room) === TerritoryIntent.EXPLOIT ||
                    getTerritoryIntent(room) === TerritoryIntent.ACQUIRE) &&
                    !Memory.offices[room]
                )
            }))
    }
    // Get viable offices in range of each territory
    for (const territory of territories) {
        const officeList: string[] = [];
        candidates.set(territory, officeList);
        for (const office of offices) {
            const route = Game.map.findRoute(territory, office);
            if (route === ERR_NO_PATH || route.length > TERRITORY_RADIUS) continue;
            officeList.push(office);
        }
        if (officeList.length === 1) {
            // Only one viable office! Skip remaining distribution
            officeTerritoryMap.get(officeList[0])?.push(territory)
            candidates.delete(territory);
        }
    }
    // Each candidate Territory now has two or more potential offices.
    for (const [territory, offices] of candidates) {
        const parentOffice = offices.reduce((min, office) => {
            if (min === '') return office;
            if ((officeTerritoryMap.get(office)?.length ?? 0) < (officeTerritoryMap.get(min)?.length ?? 0)) {
                return office;
            }
            return min;
        }, '')
        if (parentOffice === '') continue; // No viable offices
        officeTerritoryMap.get(parentOffice)?.push(territory);
    }

    lastProcessedOffices = processedOffices;
    return officeTerritoryMap;
}
