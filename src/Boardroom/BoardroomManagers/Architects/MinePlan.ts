import { BlockPlanBuilder } from "./classes/BlockPlanBuilder";
import { CachedMineral } from "WorldState/Minerals";
import { Controllers } from "WorldState/Controllers";
import { MapAnalyst } from "../../../Analysts/MapAnalyst";
import { PlannedStructure } from "./classes/PlannedStructure";

export class MinePlan extends BlockPlanBuilder {
    extractor!: PlannedStructure;
    container!: PlannedStructure;

    deserialize() {
        this.extractor = this.blockPlan.getStructure(STRUCTURE_EXTRACTOR);
        this.container = this.blockPlan.getStructure(STRUCTURE_CONTAINER);
    }
    plan(mineral: CachedMineral) {
        // Calculate from scratch
        let controller = Controllers.byRoom(mineral.pos.roomName);
        if (!controller) throw new Error('No known controller in room, unable to compute plan')

        // 1. The Mine containers will be at the first position of the path between the Mineral and the Controller.
        let route = PathFinder.search(
            mineral.pos,
            {pos: controller.pos, range: 1},
            {roomCallback: (roomName) => {
                return MapAnalyst.getCostMatrix(roomName);
            }});
        if (route.incomplete) throw new Error('Unable to calculate path between source and controller');
        this.container = new PlannedStructure(route.path[0], STRUCTURE_CONTAINER);

        // 2. The Mineral extractor will be on the mineral itself
        this.extractor = new PlannedStructure(mineral.pos, STRUCTURE_EXTRACTOR);

        if (!this.container || !this.extractor) throw new Error('Unable to plan mine')

        this.blockPlan.structures.push(this.container, this.extractor);

        return this;
    }
}
