import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { deserializePlannedStructures } from "Selectors/plannedStructures";
import { getCostMatrix } from "Selectors/MapCoordinates";

export interface TerritoryFranchisePlan {
    container: PlannedStructure;
    roads: PlannedStructure[];
}

export const deserializeTerritoryFranchisePlan = (serialized: string) => {
    const plan: Partial<TerritoryFranchisePlan> = {
        container: undefined,
        roads: [],
    }
    for (const s of deserializePlannedStructures(serialized)) {
        if (s.structureType === STRUCTURE_CONTAINER) plan.container = s;
        if (s.structureType === STRUCTURE_ROAD) plan.roads?.push(s);
    }
    return validateTerritoryFranchisePlan(plan);
}

const validateTerritoryFranchisePlan = (plan: Partial<TerritoryFranchisePlan>) => {
    if (
        !plan.container || !plan.roads?.length
    ) {
        throw new Error(`Incomplete TerritoryFranchisePlan`)
    } else {
        return plan as TerritoryFranchisePlan;
    }
}

export const planTerritoryFranchise = (sourcePos: RoomPosition, storagePos: RoomPosition) => {
    const plan: Partial<TerritoryFranchisePlan> = {
        container: undefined,
        roads: [],
    }
    // 1. The Franchise containers will be at the first position of the path between the Source and the Controller.
    let route = PathFinder.search(
        sourcePos,
        {pos: storagePos, range: 1},
        {
            plainCost: 2,
            swampCost: 10,
            maxRooms: 4,
            roomCallback: roomName => getCostMatrix(roomName, false)
        });
    if (route.incomplete) throw new Error('Unable to calculate path between source and storage');
    plan.container = new PlannedStructure(route.path[0], STRUCTURE_CONTAINER);

    plan.roads = [];

    route.path.forEach(p => {
        if (![0,49].includes(p.x) && ![0,49].includes(p.y)) {
            plan.roads?.push(new PlannedStructure(p, STRUCTURE_ROAD));
        }
    });

    return validateTerritoryFranchisePlan(plan);
}
