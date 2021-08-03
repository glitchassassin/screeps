import { controllerPosition, mineralPosition, sourceIds, sourcePositions } from 'Selectors/roomCache';
import { countTerrainTypes, getRangeTo } from 'Selectors/MapCoordinates';
import { planFranchise, serializeFranchisePlan } from 'RoomPlanner/FranchisePlan';

import { planExtensions } from 'RoomPlanner/ExtensionsPlan';
import { planHeadquarters } from 'RoomPlanner/HeadquartersPlan';
import { planMine } from 'RoomPlanner/MinePlan';
import { planTerritoryFranchise } from './TerritoryFranchise';
import { posById } from 'Selectors/posById';
import { roomPlans } from 'Selectors/roomPlans';
import { serializePlannedStructures } from 'Selectors/plannedStructures';

declare global {
    interface Memory {
        roomPlans: {
            [index: string]: {
                office: {
                    headquarters: string,
                    franchise1: string,
                    franchise2: string,
                    mine: string,
                    extensions: string,
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

    // TODO Add TerritoryFranchise planning for remote mining

    if (isEligible(roomName)) {
        try {
            const plan = planOffice(roomName);
            Memory.roomPlans[roomName] = {
                office: {
                    headquarters: serializePlannedStructures(Object.values(plan.headquarters).flat()),
                    franchise1: serializeFranchisePlan(plan.franchise1),
                    franchise2: serializeFranchisePlan(plan.franchise2),
                    mine: serializePlannedStructures(Object.values(plan.mine).flat()),
                    extensions: serializePlannedStructures(Object.values(plan.extensions).flat())
                }
            };
        } catch (e) {
            Memory.roomPlans[roomName] = null;
        }
    } else {
        console.log(roomName, 'is ineligible for an Office')
        Memory.roomPlans[roomName] = null;
    }
}

const isEligible = (roomName: string) => {
    // Room must have a controller and two sources
    // To avoid edge cases, controller and sources must not be within range 5 of each other
    let controller = posById(Memory.rooms[roomName]?.controllerId)
    if (!controller) {
        console.log(`Room planning for ${roomName} failed - No controller`);
        return false;
    }
    let sources = Memory.rooms[roomName]?.sourceIds?.map(id => posById(id))
        .filter(s => s) as RoomPosition[];
    if (!sources || sources.length < 2) {
        console.log(`Room planning for ${roomName} failed - Invalid number of sources`);
        return false;
    }

    let [source1, source2] = sources;
    if (controller.getRangeTo(source1) < 5) {
        console.log(`Room planning for ${roomName} failed - Source too close to controller`);
        return false;
    }
    if (controller.getRangeTo(source2) < 5) {
        console.log(`Room planning for ${roomName} failed - Source too close to controller`);
        return false;
    }
    if (source1.getRangeTo(source2) < 5) {
        console.log(`Room planning for ${roomName} failed - Sources too close together`);
        return false;
    }

    const terrainTypeCount = countTerrainTypes(roomName);

    if ((terrainTypeCount.swamp * 1.5) > terrainTypeCount.plains) {
        console.log(`Room planning for ${roomName} failed - Too much swamp`);
        return false;
    }
    return true;
}

const planOffice = (roomName: string) => {
    let start = Game.cpu.getUsed();

    // Get sources
    let sources = sourceIds(roomName);
    let mineral = mineralPosition(roomName);
    let controller = controllerPosition(roomName);
    if (!controller || !mineral || sources.length !== 2) throw new Error('Invalid room for planning an office');

    // Calculate FranchisePlans
    let franchise1, franchise2, mine, headquarters, extensions;
    try {
        let plans = sources
            .sort((a, b) => posById(a)!.getRangeTo(controller!) - posById(b)!.getRangeTo(controller!))
            .map(source => planFranchise(source));
        if (plans.length !== 2) throw new Error(`Unexpected number of sources: ${plans.length}`);
        [franchise1, franchise2] = plans;
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

    let end = Game.cpu.getUsed();
    console.log(`Planned Office room ${roomName} with ${end - start} CPU`);

    return {
        franchise1,
        franchise2,
        mine,
        headquarters,
        extensions,
    }
}

const planTerritory = (roomName: string, officeRoom: string) => {
    let start = Game.cpu.getUsed();

    // Get sources
    let sources = sourcePositions(roomName);
    let headquarters = roomPlans(officeRoom)?.office?.headquarters
    if (!headquarters) {
        throw new Error('FAILED generating territory - no office headquarters found')
    }
    let storage = headquarters.storage.pos

    // Calculate FranchisePlans
    let franchise1, franchise2;
    try {
        let franchises = sources
            .sort((a, b) => getRangeTo(a, storage!) - getRangeTo(b, storage!))
            .map(source => planTerritoryFranchise(source, storage!));

        [franchise1, franchise2] = franchises;
    } catch (e) {
        throw new Error('FAILED generating franchises: ' + e.message)
    }

    let end = Game.cpu.getUsed();
    console.log(`Planned Territory room ${roomName} with ${end - start} CPU`);
    return {
        franchise1,
        franchise2,
    }
}
