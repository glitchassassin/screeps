import { MustHavePath } from "TaskRequests/prereqs/MustHavePath";
import { SpeculativeMinion } from "../SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { Exclude, Transform, TransformationType, Type } from "class-transformer";
import { transformGameObject, transformRoomPosition } from "utils/transformGameObject";
import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";

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

    @Exclude()
    pathCache: RoomPosition[] = [];
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
        return `[TravelTask: ${this.distance} of ${this.destination?.roomName}{${this.destination?.x},${this.destination?.y}}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or destination, task is completed
        if (!this.destination) return TaskActionResult.FAILED;
        if (creep.pos.inRangeTo(this.destination, this.distance)) return TaskActionResult.SUCCESS ;

        let mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst;

        if (this.pathCache.length === 0) {
            let route = PathFinder.search(creep.pos, {pos: this.destination, range: this.distance}, {
                roomCallback: (room) => mapAnalyst.getCostMatrix(room)
            })
            this.pathCache = route.path;
        }

        let result = creep.moveByPath(this.pathCache);
        if (result === ERR_TIRED) {
            return TaskActionResult.INPROGRESS; // Just need to wait for minion to catch up
        } else if (result === ERR_NOT_FOUND || this.lastPosition?.isEqualTo(creep.pos)) {
            this.tries += 1;
            if (this.tries > 2) {
                // Stuck for three ticks, repath and try again
                this.repaths += 1;
                if (this.repaths > 2) {
                    // Attempted three repaths, abort
                    return TaskActionResult.FAILED;
                } else {
                    let route = PathFinder.search(creep.pos, {pos: this.destination, range: this.distance}, {
                        roomCallback: (room) => mapAnalyst.getCostMatrix(room, true)
                    })
                    this.pathCache = route.path;
                    creep.moveByPath(this.pathCache);
                }
            }
        }
        else if (result !== OK) {
            console.log('travel error', result);
            console.log('creep', creep.name, creep.pos, 'traveling to', this.destination);
            console.log(this.pathCache);
            return TaskActionResult.FAILED;
        } else {
            this.tries = 0; // Successful move, not tired, not in the same position, so reset tries to 0
        }
        this.lastPosition = creep.pos;
        return TaskActionResult.INPROGRESS;
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
