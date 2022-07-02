import { RoomPlan } from "RoomPlanner";
import { deserializeExtensionsPlan } from "RoomPlanner/Extensions/deserializeExtensionsPlan";
import { deserializeFranchisePlan } from "RoomPlanner/Franchise/deserializeFranchisePlan";
import { deserializeHeadquartersPlan } from "RoomPlanner/Headquarters/deserializeHeadquartersPlan";
import { deserializeLabsPlan } from "RoomPlanner/Labs/deserializeLabsPlan";
import { deserializeMinePlan } from "RoomPlanner/Mine/deserializeMinePlan";
import { deserializePerimeterPlan } from "RoomPlanner/Perimeter/deserializePerimeterPlan";
import { deserializeRoadsPlan } from "RoomPlanner/Roads/deserializeRoadsPlan";
import { memoizeByTick } from "utils/memoizeFunction";
import profiler from "utils/profiler";
import { posById } from "./posById";

const plans: Map<string, RoomPlan> = new Map();

const updateRoomPlan = <T extends keyof RoomPlan>(roomName: string, plan: T, deserializer: (plan: string) => RoomPlan[T]) => {
    let memoryPlan = Memory.roomPlans[roomName][plan];
    let cachedPlan = plans.get(roomName) ?? {};
    plans.set(roomName, cachedPlan);

    if (typeof memoryPlan === 'string' && !cachedPlan[plan]) {
        try {
            cachedPlan[plan] = deserializer(memoryPlan)
        } catch {
            console.log(`Error deserializing ${plan} plan for ${roomName}, resetting it`)
            delete Memory.roomPlans[roomName][plan]
        }
    }
}

export const roomPlans = profiler.registerFN((roomName: string) => {
    Memory.roomPlans ??= {};

    let plan = Memory.roomPlans[roomName];
    if (!plan) {
        plans.delete(roomName);
        return;
    }
    let cachedPlan = plans.get(roomName) ?? {}
    plans.set(roomName, cachedPlan);

    // Check if room plan needs to be updated
    updateRoomPlan(roomName, 'franchise1', deserializeFranchisePlan);
    updateRoomPlan(roomName, 'franchise2', deserializeFranchisePlan);
    updateRoomPlan(roomName, 'mine', deserializeMinePlan);
    updateRoomPlan(roomName, 'headquarters', deserializeHeadquartersPlan);
    updateRoomPlan(roomName, 'labs', deserializeLabsPlan);
    updateRoomPlan(roomName, 'extensions', deserializeExtensionsPlan);
    updateRoomPlan(roomName, 'perimeter', deserializePerimeterPlan);
    updateRoomPlan(roomName, 'roads', deserializeRoadsPlan);

    return cachedPlan;
}, 'roomPlans') as (roomName: string) => RoomPlan|undefined

export const getSpawns = memoizeByTick(
    roomName => roomName,
    (roomName: string) => {
        const plan = roomPlans(roomName);
        return plan ?
        [
            plan?.franchise1?.spawn.structure,
            plan?.franchise2?.spawn.structure,
            plan?.headquarters?.spawn.structure,
        ].filter(s => s && s.isActive()) as StructureSpawn[] :
        Game.rooms[roomName]?.find(FIND_MY_SPAWNS);
    }
)

export const getFranchisePlanBySourceId = memoizeByTick(
    id => id,
    (id: Id<Source>) => {
        const pos = posById(id);
        if (!pos) return;
        const plan = roomPlans(pos.roomName);
        if (plan?.franchise1?.sourceId === id) return plan.franchise1;
        if (plan?.franchise2?.sourceId === id) return plan.franchise2;
        return;
    }
)
