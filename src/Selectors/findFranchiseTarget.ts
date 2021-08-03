import { adjacentWalkablePositions } from "./MapCoordinates";
import { franchisesByOffice } from "./franchisesByOffice";
import { posById } from "./posById";

export const findFranchiseTarget = (creep: Creep) => {
    const sources = franchisesByOffice(creep.memory.office);
    const salesmen = Object.values(Game.creeps).filter(c => c.memory.objective === 'FranchiseObjective');
    return sources.find(s => {
        const pos = posById(s);
        const spaces = pos && adjacentWalkablePositions(pos);
        let salesmanCount = 0;
        let workPartsCount = 0;
        for (let c of salesmen) {
            if (c.memory.franchiseTarget === s) {
                salesmanCount += 1;
                workPartsCount += c.getActiveBodyparts(WORK);
            }
        }
        return spaces && (spaces.length > salesmanCount) && workPartsCount < 5
    })
}
