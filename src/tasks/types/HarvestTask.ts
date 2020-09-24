import { MustBeAtMine } from "tasks/prereqs/MustBeAtMine";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction, TaskActionResult } from "tasks/TaskAction";
import { Transform, TransformationType, Type } from "class-transformer";
import { transformGameObject } from "utils/transformGameObject";
import { MustBeAdjacent } from "tasks/prereqs/MustBeAdjacent";
import { MustHaveWorkParts } from "tasks/prereqs/MustHaveWorkParts";

export class HarvestTask extends TaskAction {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the source
    getPrereqs() {
        if (!this.source) return [];
        // return [new MustBeAtMine(this.source)]
        return [
            new MustHaveWorkParts(),
            new MustBeAdjacent(this.source.pos),
        ]
    }
    message = "⚡";

    @Type(() => Source)
    @Transform(transformGameObject(Source))
    source: Source|null = null
    constructor(
        source: Source|null = null,
    ) {
        super();
        this.source = source;
    }
    toString() {
        return `[HarvestTask: ${this.source?.id} {${this.source?.pos.x},${this.source?.pos.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.source) return TaskActionResult.FAILED;

        if (creep.harvest(this.source) === ERR_NOT_IN_RANGE) {
            return TaskActionResult.FAILED;
        }
        if (creep.store.getCapacity() > 0) {
            // If can carry, is the creep full?
            if (creep.store.getFreeCapacity() == 0) {
                return TaskActionResult.SUCCESS;
            }
        } else {
            // If cannot carry, is the local container full?
            let container = creep.pos.lookFor(LOOK_STRUCTURES)
                .find(s => s.structureType === STRUCTURE_CONTAINER)
            // If the container is full or missing, we cannot store,
            // so there is no point in harvesting
            if (!container || (container as StructureContainer).store.getFreeCapacity() === 0) {
                return TaskActionResult.FAILED;
            }
        }
        return TaskActionResult.INPROGRESS;
    }
    cost(minion: SpeculativeMinion) {
        // Approximate effectiveness of minion based on number of WORK parts
        // TODO: Adjust this to compare against the creep's capacity, or the
        //       local container, if applicable
        return 1/(minion.creep.getActiveBodyparts(WORK) * 2)
    }
    predict(minion: SpeculativeMinion) {
        return {
            ...minion,
            capacityUsed: minion.capacity,
        }
    }
    valid() {
        return !!this.source;
    }
}
