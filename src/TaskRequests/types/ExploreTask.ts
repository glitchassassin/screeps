import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";
import { Exclude, Transform, TransformationType, Type } from "class-transformer";
import { MustBeAdjacent } from "TaskRequests/prereqs/MustBeAdjacent";
import { MustHaveEnergy } from "TaskRequests/prereqs/MustHaveEnergy";
import { SpeculativeMinion } from "TaskRequests/SpeculativeMinion";
import { TaskAction, TaskActionResult } from "TaskRequests/TaskAction";
import { transformGameObject, transformRoomPosition } from "utils/transformGameObject";

export class ExploreTask extends TaskAction {
    // Prereq: Minion must be adjacent
    //         Otherwise, move to an open space
    //         near the destination
    // Prereq: Minion must have enough energy
    //         to fill target
    //         Otherwise, get some by harvesting
    //         or withdrawing
    getPrereqs() {
        if (!this.destination) return [];
        return [ ]
    }
    message = "🕵";

    destination: string|null = null;

    tries: number = 0;
    repaths: number = 0;

    @Exclude()
    pathCache: RoomPosition[] = [];
    @Transform(transformRoomPosition)
    lastPosition: RoomPosition|null = null

    constructor(
        destination: string|null = null,
    ) {
        super();
        this.destination = destination;
    }
    toString() {
        return `[ExploreTask: ${this.destination}]`
    }

    action(creep: Creep) {
        // If unable to get the creep or destination, task is completed
        if (!this.destination) return TaskActionResult.FAILED;
        if (creep.pos.roomName === this.destination) return TaskActionResult.SUCCESS ;

        let mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst;

        if (this.pathCache.length === 0) {
            let route = PathFinder.search(creep.pos, new RoomPosition(25, 25, this.destination), {
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
                    let route = PathFinder.search(creep.pos, new RoomPosition(25, 25, this.destination), {
                        roomCallback: (room) => mapAnalyst.getCostMatrix(room, true)
                    })
                    this.pathCache = route.path;
                    creep.moveByPath(this.pathCache);
                }
            }
        }
        else if (result !== OK) {
            return TaskActionResult.FAILED;
        } else {
            this.tries = 0; // Successful move, not tired, not in the same position, so reset tries to 0
        }
        this.lastPosition = creep.pos;
        return TaskActionResult.INPROGRESS;
    }
    cost() {return 1;}; // Takes one tick to transfer
    predict(minion: SpeculativeMinion) {
        return {
            ...minion,
            pos: new RoomPosition(25, 25, this.destination || ''),
            output: 10 // Arbitrary amount of work
        }
    }
    valid() {
        return !!this.destination;
    }
}
