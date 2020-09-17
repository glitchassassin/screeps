import { Transform, TransformationType, Type } from "class-transformer";
import { MustBeAtMine } from "tasks/prereqs/MustBeAtMine";
import { SpeculativeMinion, Task, TaskPrerequisite } from "../Task";
import { TravelTask } from "./TravelTask";

export class HarvestTask extends Task {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the source
    prereqs = [
        MustBeAtMine(() => this.source || undefined)
    ]
    message = "⚡";

    @Type(() => Source)
    @Transform((value, obj, type) => {
        switch(type) {
            case TransformationType.PLAIN_TO_CLASS:
                return Game.getObjectById(value as Id<Source>);
            case TransformationType.CLASS_TO_PLAIN:
                return obj.id;
            case TransformationType.CLASS_TO_CLASS:
                return obj;
        }
    })
    source: Source|null = null
    constructor(
        creep: Creep|null = null,
        source: Source|null = null,
    ) {
        super(creep);
        this.source = source;
    }

    action = () => {
        // If unable to get the creep or source, task is completed
        if (!this.creep || !this.source) return true;

        if (this.creep.harvest(this.source) === ERR_NOT_IN_RANGE) {
            this.creep.moveTo(this.source);
        }
        if (this.creep.store.getCapacity()) {
            // If can carry, is the creep full?
            return this.creep.store.getFreeCapacity() == 0;
        } else {
            // If cannot carry, is the local container full?
            let container = this.creep.pos.lookFor(LOOK_STRUCTURES)
                .find(s => s.structureType === STRUCTURE_CONTAINER)
            // If the container is full or missing, we cannot store,
            // so there is no point in harvesting
            if (!container || (container as StructureContainer).store.getFreeCapacity()) return true;
        }
        return false;
    }
    cost = (minion: SpeculativeMinion) => {
        // Approximate effectiveness of minion based on number of WORK parts
        // TODO: Adjust this to compare against the creep's capacity, or the
        //       local container, if applicable
        return 1/(minion.creep.getActiveBodyparts(WORK) * 2)
    }
}
