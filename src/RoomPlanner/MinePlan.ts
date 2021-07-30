import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { deserializePlannedStructures } from "Selectors/plannedStructures";
import { getCostMatrix } from "Selectors/MapCoordinates";
import { posById } from "Selectors/posById";

export interface MinePlan {
    extractor: PlannedStructure;
    container: PlannedStructure;
}

export const deserializeMinePlan = (serialized: string) => {
    const plan: Partial<MinePlan> = {
        extractor: undefined,
        container: undefined,
    }
    for (const s of deserializePlannedStructures(serialized)) {
        if (s.structureType === STRUCTURE_EXTRACTOR) plan.extractor = s;
        if (s.structureType === STRUCTURE_CONTAINER) plan.container = s;
    }
    return validateMinePlan(plan);
}

export const validateMinePlan = (plan: Partial<MinePlan>) => {
    if (!plan.extractor || !plan.container) {
        throw new Error(`Incomplete MinePlan`)
    } else {
        return plan as MinePlan;
    }
}

export const planMine = (mineralPos: RoomPosition) => {
    const plan: Partial<MinePlan> = {
        extractor: undefined,
        container: undefined,
    }
    // Calculate from scratch
    let controllerPos = posById(Memory.rooms[mineralPos.roomName].controllerId);
    if (!controllerPos) throw new Error('No known controller in room, unable to compute plan')

    // 1. The Mine containers will be at the first position of the path between the Mineral and the Controller.
    let route = PathFinder.search(
        mineralPos,
        {pos: controllerPos, range: 1},
        {roomCallback: (roomName) => {
            return getCostMatrix(roomName);
        }});
    if (route.incomplete) throw new Error('Unable to calculate path between source and controller');

    plan.container = new PlannedStructure(route.path[0], STRUCTURE_CONTAINER);
    // 2. The Mineral extractor will be on the mineral itself
    plan.extractor = new PlannedStructure(mineralPos, STRUCTURE_EXTRACTOR);

    return validateMinePlan(plan);
}
