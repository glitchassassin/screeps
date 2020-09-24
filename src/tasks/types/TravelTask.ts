import { MustHavePath } from "tasks/prereqs/MustHavePath";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction } from "tasks/TaskAction";
import { Transform, TransformationType, Type } from "class-transformer";
import { transformGameObject, transformRoomPosition } from "utils/transformGameObject";

export class TravelTask extends TaskAction {
    // Prereq: Minion must have a path to destination
    //         Otherwise, fail this branch
    getPrereqs() {
        if (!this.destination) return [];
        return []; // [new MustHavePath(this.destination)]
    }
    message = "🚗";

    // @Type(() => RoomPosition)
    @Transform(transformRoomPosition)
    destination: RoomPosition|null = null;
    distance: number;

    tries: number = 0;
    repaths: number = 0;
    pathCache: string = "";
    @Transform(transformRoomPosition)
    lastPosition: RoomPosition|null = null

    constructor(
        destination: RoomPosition|null = null,
        distance: number = 0
    ) {
        super();
        this.destination = destination;
        this.distance = distance;
    }
    toString() {
        return `[TravelTask: ${this.distance} of {${this.destination?.x},${this.destination?.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or destination, task is completed
        if (!this.destination) return true;

        if (this.pathCache === '') {
            let route = creep.pos.findPathTo(this.destination, {
                ignoreCreeps: true
            });
            this.pathCache = Room.serializePath(route);
        }

        let result = creep.moveByPath(this.pathCache);
        if (result === ERR_TIRED) {
            return false; // Just need to wait for minion to catch up
        }
        else if (result !== OK) {
            return true;
        } else if (this.lastPosition?.isEqualTo(creep.pos)) {
            console.log(`Stuck for ${this.tries} ticks`)
            this.tries += 1;
            if (this.tries < 2) {
                // Stuck for three ticks, repath and try again
                if (this.repaths < 2) {
                    console.log(`Repathing`)
                    this.repaths += 1;
                    let route = creep.pos.findPathTo(this.destination, {
                        ignoreCreeps: false
                    });
                    this.pathCache = Room.serializePath(route);
                    creep.moveByPath(this.pathCache);
                } else {
                    // Attempted three repaths, abort
                    return true;
                }
            }
        } else {
            this.tries = 0; // Successful move, not tired, not in the same position, so reset tries to 0
        }
        this.lastPosition = creep.pos;
        return creep.pos.inRangeTo(this.destination, this.distance);
    }
    cost(minion: SpeculativeMinion) {
        if (!this.destination) return Infinity
        // Gets approximate cost by range instead of calculating the exact cost. This is faster
        return minion.pos.getRangeTo(this.destination); //PathFinder.search(minion.pos, this.destination).cost;
    }
    predict(minion: SpeculativeMinion) {
        return {
            ...minion,
            pos: this.destination || minion.pos
        }
    }
    valid() {
        return !!this.destination;
    }
}
