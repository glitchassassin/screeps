import { franchisesByOffice } from "./franchisesByOffice";
import { adjacentWalkablePositions } from "./Map/MapCoordinates";
import { posById } from "./posById";

export const findFranchiseTarget = (creep: Creep, office: string) => {
    const sources = franchisesByOffice(office);
    const salesmen = Object.values(Game.creeps).filter(c => c.name.startsWith('HARVEST-'));
    return sources.find(({source}) => {
        const pos = posById(source);
        const spaces = pos && adjacentWalkablePositions(pos);
        let salesmanCount = 0;
        let workPartsCount = 0;
        for (let c of salesmen) {
            if (c.memory.franchiseTarget === source) {
                salesmanCount += 1;
                workPartsCount += c.getActiveBodyparts(WORK);
            }
        }
        return spaces && (spaces.length > salesmanCount) && workPartsCount < 5
    })?.source;
}
