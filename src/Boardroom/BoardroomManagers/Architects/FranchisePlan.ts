import { MapAnalyst } from "../MapAnalyst";
import { PlannedStructure } from "./classes/PlannedStructure";

export class FranchisePlan {
    rangeToController: number;
    spawn: PlannedStructure;
    link: PlannedStructure;
    container: PlannedStructure;
    extensions: PlannedStructure[] = [];

    constructor(sourcePos: RoomPosition) {
        // Calculate from scratch
        let mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst
        let controller = global.worldState.controllers.byRoom.get(sourcePos.roomName);
        if (!controller) throw new Error('No known controller in room, unable to compute plan')

        // 1. The Franchise containers will be at the first position of the path between the Source and the Controller.
        let route = PathFinder.search(sourcePos, {pos: controller.pos, range: 1});
        if (route.incomplete) throw new Error('Unable to calculate path between source and controller');
        this.container = new PlannedStructure(route.path[0], STRUCTURE_CONTAINER);
        this.rangeToController = route.cost;

        // 2. The Franchise link and spawn will be adjacent to the container, but not on the path to the Controller.
        let adjacents = mapAnalyst.calculateAdjacentPositions(this.container.pos).filter(pos => (
            mapAnalyst.isPositionWalkable(pos) &&
            !pos.isEqualTo(route.path[1])
        ))
        if (adjacents.length < 2) throw new Error('Not enough space to place a Franchise');
        this.spawn = new PlannedStructure(adjacents[0], STRUCTURE_SPAWN);
        this.link = new PlannedStructure(adjacents[1], STRUCTURE_LINK);
    }
}
