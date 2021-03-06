import { CachedSource } from "WorldState/Sources";
import { Controllers } from "WorldState/Controllers";
import { FranchiseData } from "WorldState/FranchiseData";
import { MapAnalyst } from "Analysts/MapAnalyst";
import { Office } from "Office/Office";
import { PlannedStructure } from "./classes/PlannedStructure";

export class TerritoryFranchisePlan {
    rangeToController: number;
    container: PlannedStructure;
    roads: PlannedStructure[] = [];

    constructor(public source: CachedSource, public office: Office) {
        // Calculate from scratch
        let controller = Controllers.byRoom(office.name);
        if (!controller) throw new Error('No known controller in room, unable to compute plan')

        // 1. The Franchise containers will be at the first position of the path between the Source and the Controller.
        let route = PathFinder.search(
            source.pos,
            {pos: controller.pos, range: 1},
            {
                plainCost: 2,
                swampCost: 10,
                maxRooms: 4,
                roomCallback: roomName => MapAnalyst.getCostMatrix(roomName, false)
            });
        if (route.incomplete) throw new Error('Unable to calculate path between source and controller');
        this.container = new PlannedStructure(route.path[0], STRUCTURE_CONTAINER);
        this.rangeToController = route.cost;

        route.path.forEach(p => {
            if (![0,49].includes(p.x) && ![0,49].includes(p.y)) {
                this.roads.push(new PlannedStructure(p, STRUCTURE_ROAD));
            }
        });

        // Update franchise with data
        FranchiseData.set(source.id, {
            id: source.id,
            pos: source.pos,
            containerPos: this.container.pos,
            distance: this.rangeToController,
        }, source.pos.roomName)
    }
}
