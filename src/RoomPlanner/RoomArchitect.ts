import { RoomPlan } from 'RoomPlanner';
import { planExtensions } from 'RoomPlanner/Extensions/ExtensionsPlan';
import { planFranchise } from 'RoomPlanner/Franchise/FranchisePlan';
import { planHeadquarters } from 'RoomPlanner/Headquarters/HeadquartersPlan';
import { planLabs } from 'RoomPlanner/Labs/LabsPlan';
import { planMine } from 'RoomPlanner/Mine/MinePlan';
import { planPerimeter } from 'RoomPlanner/Perimeter/PerimeterPlan';
import { serializePlannedStructures } from 'Selectors/plannedStructures';
import { sourceIds } from 'Selectors/roomCache';
import { serializeFranchisePlan } from './Franchise/serializeFranchisePlan';


declare global {
    interface Memory {
        roomPlans: {
            [index: string]: {
                complete: boolean,
                office?: boolean,
                headquarters?: string|null,
                franchise1?: string|null,
                franchise2?: string|null,
                mine?: string|null,
                extensions?: string|null,
                perimeter?: string|null,
                labs?: string|null,
            }
        }
    }
}

const roomSectionPlanner = <T extends keyof RoomPlan>(
    room: string,
    plan: T,
    planner: (room: string) => RoomPlan[T],
    serializer: (plan: RoomPlan[T]) => string
) => () => {
    if (Memory.roomPlans[room][plan] === undefined) {
        try {
            const plannedSection = planner(room)
            Memory.roomPlans[room][plan] = serializer(plannedSection)
        } catch (e) {
            console.log(`Error planning ${plan} for ${room}: ${e}`)
            Memory.roomPlans[room][plan] = null;
        }
    }
}

const serializePlan = <T extends keyof RoomPlan>(plan: RoomPlan[T]) => {
    if (!plan) throw new Error('Undefined plan, cannot serialize');
    return serializePlannedStructures(Object.values(plan ?? {}).flat())
}

export const generateRoomPlans = (roomName: string)  => {
    Memory.roomPlans ??= {};
    Memory.roomPlans[roomName] ??= {
        complete: false
    }
    if (Memory.roomPlans[roomName].complete) return;

    const [franchise1, franchise2] = sourceIds(roomName);
    const steps = [
        roomSectionPlanner(roomName, 'franchise1', () => planFranchise(franchise1), serializeFranchisePlan),
        roomSectionPlanner(roomName, 'franchise2', () => planFranchise(franchise2), serializeFranchisePlan),
        roomSectionPlanner(roomName, 'mine', planMine, serializePlan),
        roomSectionPlanner(roomName, 'headquarters', planHeadquarters, serializePlan),
        roomSectionPlanner(roomName, 'labs', planLabs, serializePlan),
        roomSectionPlanner(roomName, 'extensions', planExtensions, serializePlan),
        roomSectionPlanner(roomName, 'perimeter', planPerimeter, serializePlan),
    ]

    const start = Game.cpu.getUsed();
    for (let step of steps) {
        step();
        const used = Game.cpu.getUsed() - start;
        if (used > 10) {
            return; // continue planning next time
        }
    }

    Memory.roomPlans[roomName].complete = true;
    Memory.roomPlans[roomName].office = Memory.rooms[roomName].eligibleForOffice && (
        Memory.roomPlans[roomName].headquarters !== null &&
        Memory.roomPlans[roomName].franchise1 !== null &&
        Memory.roomPlans[roomName].franchise2 !== null &&
        Memory.roomPlans[roomName].mine !== null &&
        Memory.roomPlans[roomName].labs !== null &&
        Memory.roomPlans[roomName].extensions !== null &&
        Memory.roomPlans[roomName].perimeter !== null
    )
}
