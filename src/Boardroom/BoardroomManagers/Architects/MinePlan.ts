import { CachedMineral } from "WorldState/Minerals";
import { Controllers } from "WorldState/Controllers";
import { MapAnalyst } from "../../../Analysts/MapAnalyst";
import { MineData } from "WorldState/MineData";
import { PlannedStructure } from "./classes/PlannedStructure";

export class MinePlan {
    rangeToController: number;
    extractor: PlannedStructure;
    container: PlannedStructure;

    constructor(public mineral: CachedMineral) {
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
        this.rangeToController = route.cost;

        // 2. The Mineral extractor will be on the mineral itself
        this.extractor = new PlannedStructure(mineral.pos, STRUCTURE_EXTRACTOR);

        // Update franchise with data
        MineData.set(mineral.id, {
            id: mineral.id,
            pos: mineral.pos,
            containerPos: this.container.pos,
            distance: this.rangeToController
        }, mineral.pos.roomName)
    }
}
