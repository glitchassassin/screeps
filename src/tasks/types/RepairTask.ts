import { Transform, TransformationType, Type } from "class-transformer";
import { assert } from "console";
import { MustHaveWorkParts } from "tasks/prereqs/MustHaveWorkParts";
import { transformGameObject } from "utils/transformGameObject";
import { MustBeAdjacent } from "../prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "../prereqs/MustHaveEnergy";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction } from "../TaskAction";

export class RepairTask extends TaskAction {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the destination
    // Prereq: Minion must have enough energy
    //         to fill target
    //         Otherwise, get some by harvesting
    //         or withdrawing
    getPrereqs() {
        if (!this.destination) return [];
        return [
            new MustHaveWorkParts(),
            new MustHaveEnergy((this.destination.hitsMax - this.destination.hits)/100),
            new MustBeAdjacent(this.destination.pos, 3),
        ]
    }
    message = "🛠";

    @Type(() => Structure)
    @Transform(transformGameObject(Structure))
    destination: Structure|null = null

    constructor(
        destination: Structure|null = null,
    ) {
        super();
        this.destination = destination;
    }
    toString() {
        return `[RepairTask: ${this.destination?.id} {${this.destination?.pos.x},${this.destination?.pos.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or source, task is completed
        if (!this.destination) return true;

        let result = creep.repair(this.destination);
        if (result === ERR_NOT_IN_RANGE) {
            // creep.moveTo(this.destination);
            console.log('Could not reach destination: RepairTask');
        } else if (result !== OK){
            return true;
        }
        global.analysts.grafana.reportRepair(creep.room, Math.max(1 * creep.getActiveBodyparts(WORK), creep.store.energy))
        return this.destination.hits === this.destination.hitsMax;
    }
    /**
     * Calculates cost based on the effectiveness of the minion
     * @param minion
     */
    cost(minion: SpeculativeMinion) {
        return minion.capacity/(minion.creep.getActiveBodyparts(WORK) * 5)
    }
    predict(minion: SpeculativeMinion) {
        let targetCapacity = ((this.destination as Structure).hitsMax - (this.destination as Structure).hits)/100;
        return {
            ...minion,
            output: Math.min(minion.capacityUsed, targetCapacity),
            capacityUsed: Math.max(0, minion.capacityUsed - targetCapacity)
        }
    }
    valid() {
        return !!this.destination && this.destination.hits < this.destination.hitsMax;
    }
}
