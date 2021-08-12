import { deserializePlannedStructures } from 'Selectors/plannedStructures';
import util_mincut from '../utils/mincut';
import { ExtensionsPlan } from './ExtensionsPlan';
import { FranchisePlan } from './FranchisePlan';
import { HeadquartersPlan } from './HeadquartersPlan';
import { PlannedStructure } from './PlannedStructure';

const getBoundingRect = (...args: PlannedStructure[]) => {
    const rect = {
        x1: 50,
        y1: 50,
        x2: 0,
        y2: 0
    }
    for (let s of args) {
        rect.x1 = Math.min(s.pos.x, rect.x1)
        rect.y1 = Math.min(s.pos.y, rect.y1)
        rect.x2 = Math.max(s.pos.x, rect.x2)
        rect.y2 = Math.max(s.pos.y, rect.y2)
    }
    return rect;
}

export interface PerimeterPlan {
    ramparts: PlannedStructure[];
}

export const deserializePerimeterPlan = (serialized: string) => {
    const plan: PerimeterPlan = {
        ramparts: []
    }
    for (const s of deserializePlannedStructures(serialized)) {
        if (s.structureType === STRUCTURE_RAMPART) plan.ramparts.push(s);
    }
    return validatePerimeterPlan(plan);
}

export const validatePerimeterPlan = (plan: Partial<PerimeterPlan>) => {
    if (!plan.ramparts?.length) {
        throw new Error(`Incomplete PerimeterPlan`)
    } else {
        return plan as PerimeterPlan;
    }
}

export const planPerimeter = (controllerPos: RoomPosition, hq: HeadquartersPlan, extensions: ExtensionsPlan, franchise1: FranchisePlan, franchise2: FranchisePlan) => {
    const plan: Partial<PerimeterPlan> = {
        ramparts: util_mincut.GetCutTiles(controllerPos.roomName, [
            getBoundingRect(...hq.towers),
            getBoundingRect(...extensions.extensions),
            getBoundingRect(franchise1.spawn, franchise1.container, franchise1.link),
            getBoundingRect(franchise2.spawn, franchise2.container, franchise2.link),
        ]).map(pos => new PlannedStructure(new RoomPosition(pos.x, pos.y, controllerPos!.roomName), STRUCTURE_RAMPART)),
    }

    return validatePerimeterPlan(plan);
}
