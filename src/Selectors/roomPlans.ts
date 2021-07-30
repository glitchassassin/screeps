import { ExtensionsPlan, deserializeExtensionsPlan } from "RoomPlanner/ExtensionsPlan";
import { FranchisePlan, deserializeFranchisePlan } from "RoomPlanner/FranchisePlan";
import { HeadquartersPlan, deserializeHeadquartersPlan } from "RoomPlanner/HeadquartersPlan";
import { MinePlan, deserializeMinePlan } from "RoomPlanner/MinePlan";

import { posById } from "./posById";

export interface RoomPlan {
    office: {
        headquarters: HeadquartersPlan,
        franchise1: FranchisePlan,
        franchise2: FranchisePlan,
        mine: MinePlan,
        extensions: ExtensionsPlan,
    }
}

const plans: Record<string, RoomPlan> = {}

export const roomPlans = (roomName: string) => {
    Memory.roomPlans ??= {};

    let plan = Memory.roomPlans[roomName];
    if (!plan) {
        delete plans[roomName];
        return;
    }

    plans[roomName] ??= {
        office: {
            headquarters: deserializeHeadquartersPlan(plan.office.headquarters),
            franchise1: deserializeFranchisePlan(plan.office.franchise1),
            franchise2: deserializeFranchisePlan(plan.office.franchise2),
            mine: deserializeMinePlan(plan.office.mine),
            extensions: deserializeExtensionsPlan(plan.office.extensions),
        }
    }
    return plans[roomName]
}

export const spawns = (roomName: string) => {
    return [
        roomPlans(roomName)?.office.franchise1.spawn.structure,
        roomPlans(roomName)?.office.franchise2.spawn.structure,
        roomPlans(roomName)?.office.headquarters.spawn.structure,
    ].filter(s => s) as StructureSpawn[];
}

export const getFranchisePlanBySourceId = (id: Id<Source>) => {
    const pos = posById(id);
    if (!pos) return;
    const plan = roomPlans(pos.roomName);
    if (!plan) return;
    if (plan.office.franchise1.sourceId === id) return plan.office.franchise1;
    if (plan.office.franchise2.sourceId === id) return plan.office.franchise2;
    return;
}
