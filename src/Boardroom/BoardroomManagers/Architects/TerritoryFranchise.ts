import { BlockPlanBuilder } from "./classes/BlockPlanBuilder";
import { CachedSource } from "WorldState/Sources";
import { MapAnalyst } from "Analysts/MapAnalyst";
import { PlannedStructure } from "./classes/PlannedStructure";

export class TerritoryFranchisePlan extends BlockPlanBuilder {
    container!: PlannedStructure;
    roads: PlannedStructure[] = [];

    deserialize() {
        this.container = this.blockPlan.getStructure(STRUCTURE_CONTAINER);
        this.roads = this.blockPlan.getStructures(STRUCTURE_ROAD);
    }

    plan(source: CachedSource, storagePos: RoomPosition) {

        // 1. The Franchise containers will be at the first position of the path between the Source and the Controller.
        let route = PathFinder.search(
            source.pos,
            {pos: storagePos, range: 1},
            {
                plainCost: 2,
                swampCost: 10,
                maxRooms: 4,
                roomCallback: roomName => MapAnalyst.getCostMatrix(roomName, false)
            });
        if (route.incomplete) throw new Error('Unable to calculate path between source and storage');
        this.container = new PlannedStructure(route.path[0], STRUCTURE_CONTAINER);

        route.path.forEach(p => {
            if (![0,49].includes(p.x) && ![0,49].includes(p.y)) {
                this.roads.push(new PlannedStructure(p, STRUCTURE_ROAD));
            }
        });

        return this;
    }
}
