import { FranchisePlan } from "RoomPlanner";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { calculateAdjacentPositions, isPositionWalkable } from "Selectors/Map/MapCoordinates";
import { posById } from "Selectors/posById";
import { validateFranchisePlan } from "./validateFranchisePlan";

export const EMPTY_ID = '                        '

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

    // console.log('Found spawn', spawn)

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
    const containerPos = route.path.length ? route.path[0] : calculateAdjacentPositions(sourcePos).find(pos => isPositionWalkable(pos, true, true) && (pos.x > 1 && pos.x < 48 && pos.y > 1 && pos.y < 48));
    if (!containerPos) throw new Error('Unable to place container')
    plan.container = new PlannedStructure(
        containerPos,
        STRUCTURE_CONTAINER
    );

    // console.log('container', plan.container.pos)

    // 2. The Franchise link and spawn will be adjacent to the container, but not on the path to the Controller,
    // and not too close to an edge (to make room for exit ramparts, if needed)
    let adjacents = calculateAdjacentPositions(plan.container.pos).filter(pos => (
        isPositionWalkable(pos, true, true) &&
        (route.path[1] ? !pos.isEqualTo(route.path[1]) : pos.getRangeTo(controllerPos!) > 1) &&
        (pos.x > 1 && pos.x < 48 && pos.y > 1 && pos.y < 48)
    ))
    if (spawn) {
        plan.spawn = new PlannedStructure(spawn.pos, STRUCTURE_SPAWN)
        adjacents = adjacents.filter(pos => !pos.isEqualTo(plan.spawn!.pos));
    } else {
        let spawnPos = adjacents.shift();
        if (!spawnPos) throw new Error('Not enough space to place a Franchise');
        plan.spawn = new PlannedStructure(spawnPos, STRUCTURE_SPAWN);
    }
    // console.log('spawn', plan.spawn.pos)
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
