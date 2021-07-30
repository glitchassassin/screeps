import { mineralId, sourcePositions } from "Selectors/roomCache";

import { MinionTypes } from "./minionTypes";
import { adjacentWalkablePositions } from "Selectors/MapCoordinates";
import { byId } from "Selectors/byId";
import { facilitiesWorkToDo } from "Selectors/facilitiesWorkToDo";
import { officeShouldAcquireTarget } from "Selectors/findAcquireTarget";
import { roomPlans } from "Selectors/roomPlans";

export const spawnTargets = (officeName: string) => {
    const spawnTargets: Partial<Record<MinionTypes, number>> = {};

    const rcl = Game.rooms[officeName].controller?.level ?? 0;
    const plan = roomPlans(officeName)?.office;
    if (!plan) return spawnTargets;

    const franchises = sourcePositions(officeName);
    const linkCount = (plan.franchise1.link.structure ? 1 : 0) + (plan.franchise2.link.structure ? 1 : 0)
    const mineCount = (plan.mine.extractor.structure && byId(mineralId(officeName))?.ticksToRegeneration) ? 1 : 0
    const spawnCount = (plan.franchise1.spawn.structure ? 1 : 0) + (plan.franchise2.spawn.structure ? 1 : 0) + (plan.headquarters.spawn.structure ? 1 : 0)
    // Slightly overestimate number of salesmen to account for early transitional periods where we have some lingering
    // low-capacity salesmen
    const workPartsPerSalesman = Math.min(7, Math.floor((Game.rooms[officeName].energyCapacityAvailable - 50) / 100));
    const salesmenPerFranchise = Math.ceil(7 / workPartsPerSalesman);
    const maxSalesmen = franchises.reduce((sum, f) => sum + adjacentWalkablePositions(f).length, 0)

    spawnTargets[MinionTypes.SALESMAN] = Math.min(maxSalesmen, franchises.length * salesmenPerFranchise, 5 * spawnCount);

    // More accountants at lower energy levels, fewer when we have links
    const lowEnergyBonus = Game.rooms[officeName].energyCapacityAvailable < 800 ? 1 : 0
    const linkBonus = Math.min(0, -(linkCount - 1))
    spawnTargets[MinionTypes.ACCOUNTANT] = Math.max(spawnTargets[MinionTypes.SALESMAN]!, (franchises.length + mineCount) * 1.5 + lowEnergyBonus + linkBonus);

    const workPartsPerEngineer = Math.min(25, Math.floor(((1/2) * Game.rooms[officeName].energyCapacityAvailable) / 100));
    spawnTargets[MinionTypes.ENGINEER] = Math.min(
        spawnTargets[MinionTypes.ACCOUNTANT]!,
        facilitiesWorkToDo(officeName).length
    );
    spawnTargets[MinionTypes.FOREMAN] = mineCount;

    // Once engineers are done, until room hits RCL 8, surplus energy should go to upgrading
    const workPartsPerParalegal = Math.floor(((Game.rooms[officeName].energyCapacityAvailable - 50) * 3/4) / 100)
    const paralegals = Math.ceil((franchises.length * 7) / (UPGRADE_CONTROLLER_POWER * workPartsPerParalegal));
    if (rcl === 8 || spawnTargets[MinionTypes.ENGINEER]! > 1) {
        spawnTargets[MinionTypes.PARALEGAL] = 1
    } else if (spawnTargets[MinionTypes.SALESMAN] === 0) {
        spawnTargets[MinionTypes.PARALEGAL] = 0
    } else {
        spawnTargets[MinionTypes.PARALEGAL] = paralegals;
    }

    spawnTargets[MinionTypes.INTERN] = (rcl > 1) ? 1 : 0;

    spawnTargets[MinionTypes.LAWYER] = officeShouldAcquireTarget(officeName) ? 1 : 0;

    return spawnTargets;
}
