import { BlockPlanBuilder } from "./classes/BlockPlanBuilder";
import { CachedSource } from "WorldState/Sources";
import { Controllers } from "WorldState/Controllers";
import { MapAnalyst } from "../../../Analysts/MapAnalyst";
import { PlannedStructure } from "./classes/PlannedStructure";

export class FranchisePlan extends BlockPlanBuilder {
    spawn!: PlannedStructure;
    link!: PlannedStructure;
    container!: PlannedStructure;
    extensions!: PlannedStructure[];

    deserialize() {
        this.spawn = this.blockPlan.getStructure(STRUCTURE_SPAWN);
        this.link = this.blockPlan.getStructure(STRUCTURE_LINK);
        this.container = this.blockPlan.getStructure(STRUCTURE_CONTAINER);
        // this.extensions = this.blockPlan.getStructures(STRUCTURE_EXTENSION);
        this.extensions = [];
    }
    plan(source: CachedSource) {
        // Calculate from scratch
        let controller = Controllers.byRoom(source.pos.roomName);
        if (!controller) throw new Error('No known controller in room, unable to compute plan')

        // 0. Check if an initial spawn already exists near Source.
        let spawn: StructureSpawn|undefined = undefined;
        try { [spawn] = source.pos.findInRange(FIND_MY_SPAWNS, 2); } catch {}

        // 1. The Franchise containers will be at the first position of the path between the Source and the Controller.
        let route = PathFinder.search(
            source.pos,
            {pos: controller.pos, range: 1},
            {roomCallback: () => {
                let cm = new PathFinder.CostMatrix();
                if (spawn) cm.set(spawn.pos.x, spawn.pos.y, 255)
                return cm;
            }});
        if (route.incomplete) throw new Error('Unable to calculate path between source and controller');
        this.container = new PlannedStructure(route.path[0], STRUCTURE_CONTAINER);

        // 2. The Franchise link and spawn will be adjacent to the container, but not on the path to the Controller.
        let adjacents = MapAnalyst.calculateAdjacentPositions(this.container.pos).filter(pos => (
            MapAnalyst.isPositionWalkable(pos) &&
            !pos.isEqualTo(route.path[1])
        ))
        if (spawn) {
            this.spawn = new PlannedStructure(spawn.pos, STRUCTURE_SPAWN)
            adjacents = adjacents.filter(pos => !pos.isEqualTo(this.spawn.pos));
        } else {
            let spawnPos = adjacents.shift();
            if (!spawnPos) throw new Error('Not enough space to place a Franchise');
            this.spawn = new PlannedStructure(spawnPos, STRUCTURE_SPAWN);
        }
        let linkPos = adjacents.shift();
        if (!linkPos) throw new Error('Not enough space to place a Franchise');
        this.link = new PlannedStructure(linkPos, STRUCTURE_LINK);

        this.extensions = [];

        this.blockPlan.structures.push(
            this.spawn,
            this.link,
            this.container,
            ...this.extensions,
        )

        return this;
    }
}
