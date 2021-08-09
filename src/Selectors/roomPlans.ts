import { deserializeExtensionsPlan, ExtensionsPlan } from "RoomPlanner/ExtensionsPlan";
import { deserializeFranchisePlan, FranchisePlan } from "RoomPlanner/FranchisePlan";
import { deserializeHeadquartersPlan, HeadquartersPlan } from "RoomPlanner/HeadquartersPlan";
import { deserializeMinePlan, MinePlan } from "RoomPlanner/MinePlan";
import { deserializeTerritoryFranchisePlan, TerritoryFranchisePlan } from "RoomPlanner/TerritoryFranchise";
import profiler from "screeps-profiler";
import { posById } from "./posById";


export interface RoomPlan {
    office?: {
        headquarters: HeadquartersPlan,
        franchise1: FranchisePlan,
        franchise2: FranchisePlan,
        mine: MinePlan,
        extensions: ExtensionsPlan,
    },
    territory?: {
        franchise1: TerritoryFranchisePlan,
        franchise2?: TerritoryFranchisePlan,
    }
}

const plans: Record<string, RoomPlan> = {}

export const roomPlans = profiler.registerFN((roomName: string) => {
    if (plans[roomName]) {
        return plans[roomName];
    }
    Memory.roomPlans ??= {};

    let plan = Memory.roomPlans[roomName];
    if (!plan) {
        delete plans[roomName];
        return;
    }

    const territory = plan.territory ? {
        franchise1: deserializeTerritoryFranchisePlan(plan.territory.franchise1),
        franchise2: plan.territory.franchise2 ? deserializeTerritoryFranchisePlan(plan.territory.franchise2) : undefined,
    } : undefined;
    const office = plan.office ? {
        headquarters: deserializeHeadquartersPlan(plan.office.headquarters),
        franchise1: deserializeFranchisePlan(plan.office.franchise1),
        franchise2: deserializeFranchisePlan(plan.office.franchise2),
        mine: deserializeMinePlan(plan.office.mine),
        extensions: deserializeExtensionsPlan(plan.office.extensions),
    } : undefined;

    plans[roomName] ??= { office, territory }
    return plans[roomName]
}, 'roomPlans') as (roomName: string) => RoomPlan|undefined

export const spawns = (roomName: string) => {
    return [
        roomPlans(roomName)?.office?.franchise1.spawn.structure,
        roomPlans(roomName)?.office?.franchise2.spawn.structure,
        roomPlans(roomName)?.office?.headquarters.spawn.structure,
    ].filter(s => s) as StructureSpawn[];
}

export const getFranchisePlanBySourceId = profiler.registerFN((id: Id<Source>) => {
    const pos = posById(id);
    if (!pos) return;
    const plan = roomPlans(pos.roomName);
    if (!plan?.office) return;
    if (plan.office.franchise1.sourceId === id) return plan.office.franchise1;
    if (plan.office.franchise2.sourceId === id) return plan.office.franchise2;
    return;
}, 'getFranchisePlanBySourceId')

export const getTerritoryFranchisePlanBySourceId = (id: Id<Source>) => {
    const pos = posById(id);
    if (!pos) return;
    const plan = roomPlans(pos.roomName);
    if (!plan) return;
    if (plan.territory?.franchise1.sourceId === id) return plan.territory.franchise1;
    if (plan.territory?.franchise2?.sourceId === id) return plan.territory.franchise2;
    return;
}
