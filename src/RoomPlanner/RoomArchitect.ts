import { planExtensions } from 'RoomPlanner/ExtensionsPlan';
import { planFranchise, serializeFranchisePlan } from 'RoomPlanner/FranchisePlan';
import { planHeadquarters } from 'RoomPlanner/HeadquartersPlan';
import { planMine } from 'RoomPlanner/MinePlan';
import { serializePlannedStructures } from 'Selectors/plannedStructures';
import { posById } from 'Selectors/posById';
import { controllerPosition, mineralPosition, sourceIds } from 'Selectors/roomCache';
import { planPerimeter } from './PerimeterPlan';
import { planTerritoryFranchise, serializeTerritoryFranchisePlan } from './TerritoryFranchise';


declare global {
    interface Memory {
        roomPlans: {
            [index: string]: {
                office?: {
                    headquarters: string,
                    franchise1: string,
                    franchise2: string,
                    mine: string,
                    extensions: string,
                    perimeter: string,
                },
                territory?: {
                    franchise1: string,
                    franchise2?: string
                }
            } | null
        }
    }
}

export const generateRoomPlans = (roomName: string)  => {
    Memory.roomPlans ??= {};

    if (Memory.roomPlans[roomName] !== undefined) return; // Already planned

    let office, territory;
    if (Memory.rooms[roomName].eligibleForOffice) {
        try {
            const officePlan = planOffice(roomName);
            office = {
                headquarters: serializePlannedStructures(Object.values(officePlan.headquarters).flat()),
                franchise1: serializeFranchisePlan(officePlan.franchise1),
                franchise2: serializeFranchisePlan(officePlan.franchise2),
                mine: serializePlannedStructures(Object.values(officePlan.mine).flat()),
                extensions: serializePlannedStructures(Object.values(officePlan.extensions).flat()),
                perimeter: serializePlannedStructures(Object.values(officePlan.perimeter).flat())
            };
        } catch (e) {
            console.log(roomName, 'failed Office planning', e)
        }
    } else {
        console.log(roomName, 'is ineligible for an Office')
    }
    try {
        const territoryPlan = planTerritory(roomName);
        territory = territoryPlan.franchise1 ? {
            franchise1: serializeTerritoryFranchisePlan(territoryPlan.franchise1),
            franchise2: territoryPlan.franchise2 && serializeTerritoryFranchisePlan(territoryPlan.franchise2),
        } : undefined;
    } catch (e) {
        console.log(roomName, 'failed Territory planning', e)
    }
    Memory.roomPlans[roomName] = { office, territory };

}

const planOffice = (roomName: string) => {
    let start = Game.cpu.getUsed();

    // Get sources
    let sources = sourceIds(roomName);
    let mineral = mineralPosition(roomName);
    let controller = controllerPosition(roomName);
    if (!controller || !mineral || sources.length !== 2) throw new Error('Invalid room for planning an office');

    // Calculate FranchisePlans
    let franchise1, franchise2, mine, headquarters, extensions, perimeter;
    try {
        let plans = sources
            .sort((a, b) => posById(a)!.getRangeTo(controller!) - posById(b)!.getRangeTo(controller!))
            .map(source => planFranchise(source));
        if (plans.length !== 2) throw new Error(`Unexpected number of sources: ${plans.length}`);
        // If one plan has a spawn already, that is franchise1
        [franchise1, franchise2] = plans.sort((a, b) => (!b.spawn.structure && a.spawn.structure) ? -1 : 0);
    } catch (e) {
        throw new Error('FAILED generating franchises: ' + e.message);
    }
    try {
        if (!mineral) throw new Error(`No mineral found in room`)
        mine = planMine(mineral)
    } catch (e) {
        throw new Error('FAILED generating mine: ' + e.message)
    }
    try {
        headquarters = planHeadquarters(roomName);
    } catch (e) {
        throw new Error('FAILED generating headquarters: ' + e.message)
    }
    // Fill in remaining extensions

    try {
        extensions = planExtensions(roomName, franchise1, franchise2, mine, headquarters);
    } catch (e) {
        throw new Error('FAILED generating extensions: ' + e.message)
    }

    // Draw min-cut perimeter
    try {
        perimeter = planPerimeter(controller, headquarters, extensions, franchise1, franchise2);
    } catch (e) {
        throw new Error('FAILED generating perimeter: ' + e.message)
    }

    let end = Game.cpu.getUsed();
    console.log(`Planned Office room ${roomName} with ${end - start} CPU`);

    return {
        franchise1,
        franchise2,
        mine,
        headquarters,
        extensions,
        perimeter,
    }
}

const planTerritory = (roomName: string) => {
    let start = Game.cpu.getUsed();

    // Calculate FranchisePlans
    let franchise1, franchise2;
    try {
        [franchise1, franchise2] = sourceIds(roomName).map(source => planTerritoryFranchise(source));
    } catch (e) {
        throw new Error('FAILED generating territory franchises: ' + e.message)
    }

    let end = Game.cpu.getUsed();
    console.log(`Planned Territory room ${roomName} with ${end - start} CPU`);
    return {
        franchise1,
        franchise2,
    }
}
