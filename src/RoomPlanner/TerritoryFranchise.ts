import { deserializePlannedStructures, serializePlannedStructures } from "Selectors/plannedStructures";

import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { getCostMatrix } from "Selectors/MapCoordinates";
import { posById } from "Selectors/posById";

export interface TerritoryFranchisePlan {
    sourceId: Id<Source>;
    container: PlannedStructure;
}

const EMPTY_ID = '                        '

export const serializeTerritoryFranchisePlan = (plan: TerritoryFranchisePlan) => {
    const {sourceId, ...structures} = plan;
    return sourceId + EMPTY_ID.slice(sourceId.length) + serializePlannedStructures(Object.values(structures).flat())
}

export const deserializeTerritoryFranchisePlan = (serialized: string) => {
    const plan: Partial<TerritoryFranchisePlan> = {
        sourceId: serialized.slice(0, 24).trim() as Id<Source>,
        container: undefined,
    }
    for (const s of deserializePlannedStructures(serialized.slice(24))) {
        if (s.structureType === STRUCTURE_CONTAINER) plan.container = s;
    }
    return validateTerritoryFranchisePlan(plan);
}

const validateTerritoryFranchisePlan = (plan: Partial<TerritoryFranchisePlan>) => {
    if (
        !plan.container
    ) {
        throw new Error(`Incomplete TerritoryFranchisePlan`)
    } else {
        return plan as TerritoryFranchisePlan;
    }
}

export const planTerritoryFranchise = (sourceId: Id<Source>) => {
    const plan: Partial<TerritoryFranchisePlan> = {
        sourceId,
        container: undefined,
    }
    let sourcePos = posById(sourceId)
    if (!sourcePos) throw new Error(`No source pos cached for ${sourceId}`)
    let controllerPos = posById(Memory.rooms[sourcePos.roomName].controllerId) ?? new RoomPosition(25, 25, sourcePos.roomName);
    // 1. The Franchise containers will be at the first position of the path between the Source and the Controller.
    let route = PathFinder.search(
        sourcePos,
        {pos: controllerPos, range: 5},
        {
            plainCost: 2,
            swampCost: 10,
            maxRooms: 4,
            roomCallback: roomName => getCostMatrix(roomName, false)
        });
    if (route.incomplete) throw new Error('Unable to calculate path between source and storage');
    plan.container = new PlannedStructure(route.path[0], STRUCTURE_CONTAINER);

    return validateTerritoryFranchisePlan(plan);
}
