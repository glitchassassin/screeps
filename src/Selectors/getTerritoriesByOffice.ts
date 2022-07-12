import { TERRITORY_RADIUS } from "config";
import { calculateNearbyRooms, getClosestOfficeFromMemory, isSourceKeeperRoom } from "./MapCoordinates";
import { getTerritoryIntent, TerritoryIntent } from "./territoryIntent";

declare global {
    interface OfficeMemory {
        territories?: string[]
    }
}

let lastCalculatedTick = 0;

export const getTerritoriesByOffice = (office: string) => {
    // logCpuStart()
    if (lastCalculatedTick !== Game.time) {
        recalculateTerritories();
        lastCalculatedTick = Game.time;
        // logCpu('Recalculated territories')
    }
    return Memory.offices[office]?.territories ?? [];
}

function recalculateTerritories() {
    // if (Game.cpu.bucket < 500) return; // don't recalculate with low bucket
    if (Game.time % 50 !== 0) return; // run once every 50 ticks

    for (const office in Memory.offices) {
        const targets = calculateNearbyRooms(office, TERRITORY_RADIUS, false)
            .filter(t => (
                !isSourceKeeperRoom(t) &&
                Memory.rooms[t]?.officePaths[office] &&
                !Memory.offices[t] &&
                getClosestOfficeFromMemory(t) === office &&
                getTerritoryIntent(t) !== TerritoryIntent.AVOID
            ));
        Memory.offices[office].territories = [];
        targets.forEach(t => {
            Memory.rooms[t].office = office;
            Memory.offices[office].territories?.push(t);
        })
    }
}
