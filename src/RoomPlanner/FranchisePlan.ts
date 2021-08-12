import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { calculateAdjacentPositions, isPositionWalkable } from "Selectors/MapCoordinates";
import { deserializePlannedStructures, serializePlannedStructures } from "Selectors/plannedStructures";
import { posById } from "Selectors/posById";


export interface FranchisePlan {
    sourceId: Id<Source>;
    spawn: PlannedStructure;
    link: PlannedStructure;
    container: PlannedStructure;
    extensions: PlannedStructure[];
    ramparts: PlannedStructure[];
}

const EMPTY_ID = '                        '

export const serializeFranchisePlan = (plan: FranchisePlan) => {
    const {sourceId, ...structures} = plan;
    return sourceId + EMPTY_ID.slice(sourceId.length) + serializePlannedStructures(Object.values(structures).flat())
}

export const deserializeFranchisePlan = (serialized: string) => {
    const plan: Partial<FranchisePlan> = {
        sourceId: serialized.slice(0, 24).trim() as Id<Source>,
        spawn: undefined,
        link: undefined,
        container: undefined,
        extensions: [],
        ramparts: [],
    }
    for (const s of deserializePlannedStructures(serialized.slice(24))) {
        if (s.structureType === STRUCTURE_SPAWN) plan.spawn = s;
        if (s.structureType === STRUCTURE_LINK) plan.link = s;
        if (s.structureType === STRUCTURE_CONTAINER) plan.container = s;
        if (s.structureType === STRUCTURE_RAMPART) plan.ramparts?.push(s);
        if (s.structureType === STRUCTURE_EXTENSION) plan.extensions?.push(s);
    }
    return validateFranchisePlan(plan);
}

const validateFranchisePlan = (plan: Partial<FranchisePlan>) => {
    if (
        !plan.sourceId || !plan.spawn || !plan.link || !plan.container // || !plan.ramparts?.length
    ) {
        throw new Error(`Incomplete FranchisePlan`)
    } else {
        return plan as FranchisePlan;
    }
}
export const planFranchise = (sourceId: Id<Source>) => {
    const plan: Partial<FranchisePlan> = {
        sourceId,
        spawn: undefined,
        link: undefined,
        container: undefined,
        extensions: [],
        ramparts: [],
    }
    let sourcePos = posById(sourceId)
    if (!sourcePos) throw new Error(`No source pos cached for ${sourceId}`)
    // Calculate from scratch
    let controllerPos = posById(Memory.rooms[sourcePos.roomName].controllerId);
    if (!controllerPos) throw new Error('No known controller in room, unable to compute plan')

    // 0. Check if an initial spawn already exists near Source.
    let spawn: StructureSpawn|undefined = undefined;
    try { [spawn] = sourcePos.findInRange(FIND_MY_SPAWNS, 3); } catch {}

    // 1. The Franchise containers will be at the first position of the path between the Source and the Controller.
    let route = PathFinder.search(
        sourcePos,
        {pos: controllerPos, range: 1},
        {roomCallback: () => {
            let cm = new PathFinder.CostMatrix();
            if (spawn) cm.set(spawn.pos.x, spawn.pos.y, 255)
            return cm;
        }});
    if (route.incomplete) throw new Error('Unable to calculate path between source and controller');
    plan.container = new PlannedStructure(route.path[0], STRUCTURE_CONTAINER);

    // 2. The Franchise link and spawn will be adjacent to the container, but not on the path to the Controller.
    let adjacents = calculateAdjacentPositions(plan.container.pos).filter(pos => (
        isPositionWalkable(pos, true, true) &&
        !pos.isEqualTo(route.path[1])
    ))
    if (spawn) {
        plan.spawn = new PlannedStructure(spawn.pos, STRUCTURE_SPAWN)
        adjacents = adjacents.filter(pos => !pos.isEqualTo(plan.spawn!.pos));
    } else {
        let spawnPos = adjacents.shift();
        if (!spawnPos) throw new Error('Not enough space to place a Franchise');
        plan.spawn = new PlannedStructure(spawnPos, STRUCTURE_SPAWN);
    }
    let linkPos = adjacents.shift();
    if (!linkPos) throw new Error('Not enough space to place a Franchise');
    plan.link = new PlannedStructure(linkPos, STRUCTURE_LINK);

    // plan.ramparts = calculateAdjacentPositions(plan.spawn.pos)
    //     .filter(pos => (
    //         isPositionWalkable(pos, true, true) &&
    //         !pos.isEqualTo(plan.link!.pos) &&
    //         !pos.isEqualTo(plan.container!.pos)
    //     ))
    //     .map(pos => new PlannedStructure(pos, STRUCTURE_RAMPART));

    // plan.ramparts.push(new PlannedStructure(plan.spawn.pos, STRUCTURE_RAMPART))
    // plan.ramparts.push(new PlannedStructure(plan.link.pos, STRUCTURE_RAMPART))
    // plan.ramparts.push(new PlannedStructure(plan.container.pos, STRUCTURE_RAMPART))

    plan.extensions = [];

    return validateFranchisePlan(plan);
}
