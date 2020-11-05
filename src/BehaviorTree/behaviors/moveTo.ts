import { BehaviorResult, Blackboard, Sequence } from "BehaviorTree/Behavior";

import { CachedCreep } from "WorldState";
import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";

export class Route {
    lastPos?: RoomPosition;
    path?: RoomPosition[];
    stuckForTicks: number = 0;
    recalculatedPath: number = 0;

    constructor(
        creep: CachedCreep,
        public pos: RoomPosition,
        public range: number = 1,
        private mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst
    ) {
        this.calculatePath(creep);
    }

    calculatePath(creep: CachedCreep, avoidCreeps = false) {
        let positionsInRange = this.mapAnalyst.calculateNearbyPositions(this.pos, this.range, true)
                                         .filter(pos => this.mapAnalyst.isPositionWalkable(pos, !avoidCreeps));
        let route = PathFinder.search(creep.pos, positionsInRange, {
            roomCallback: (room) => this.mapAnalyst.getCostMatrix(room, avoidCreeps)
        })
        this.path = route.path;
        this.lastPos = creep.pos;
    }

    run(creep: CachedCreep) {
        if (this.recalculatedPath > 2 || !this.path) {
            return ERR_NO_PATH;
        }
        this.stuckForTicks = (this.lastPos && creep.pos.isEqualTo(this.lastPos)) ? this.stuckForTicks + 1 : 0;
        if (this.stuckForTicks > 2) {
            this.recalculatedPath += 1;
            this.calculatePath(creep, true);
        }
        this.lastPos = creep.pos;
        let result = creep.gameObj.moveByPath(this.path);
        return (result === ERR_TIRED) ? OK : result;
    }
    visualize() {
        if (!this.path) return;
        let rooms = this.path.reduce((r, pos) => (r.includes(pos.roomName) ? r : [...r, pos.roomName]), [] as string[])
        rooms.forEach(room => {
            // Technically this could cause weirdness if the road loops out of a room
            // and then back into it. If that happens, we'll just need to parse this
            // into segments a little more intelligently
            if (!this.path) return;
            new RoomVisual(room).poly(this.path.filter(pos => pos.roomName === room), {lineStyle: 'dotted', stroke: '#fff'});
        })
    }
}

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        movePos?: RoomPosition,
        moveRange?: number,
        moveRoute?: Route
    }
}

export const setMoveTarget = (pos: RoomPosition, range = 1) => {
    return (creep: CachedCreep, bb: Blackboard) => {
        if (bb.movePos && pos.isEqualTo(bb.movePos)) return BehaviorResult.SUCCESS;
        bb.movePos = pos;
        bb.moveRange = range;
        bb.moveRoute = new Route(creep, pos, range)
        return BehaviorResult.SUCCESS;
    }
}

export const setMoveTargetFromBlackboard = (range = 1) => {
    return (creep: CachedCreep, bb: Blackboard) => {
        if (!bb.target) return BehaviorResult.FAILURE;
        if (bb.movePos && bb.target.pos.isEqualTo(bb.movePos)) return BehaviorResult.SUCCESS;
        bb.movePos = bb.target.pos;
        bb.moveRange = range;
        bb.moveRoute = new Route(creep, bb.target.pos, range)
        return BehaviorResult.SUCCESS;
    }
}

export const moveToTarget = () => {
    return (creep: CachedCreep, bb: Blackboard) => {
        if (!creep.gameObj || !bb.movePos || !bb.moveRange || !bb.moveRoute) return BehaviorResult.FAILURE;
        if (creep.pos.inRangeTo(bb.movePos, bb.moveRange)) return BehaviorResult.SUCCESS;

        bb.moveRoute.visualize();
        let result = bb.moveRoute.run(creep);
        if (result === ERR_NOT_FOUND) {
            if (creep.pos.x === 0) {
                creep.gameObj.move(RIGHT);
            } else if (creep.pos.x === 49) {
                creep.gameObj.move(LEFT);
            } else if (creep.pos.y === 0) {
                creep.gameObj.move(BOTTOM);
            } else if (creep.pos.y === 49) {
                creep.gameObj.move(TOP);
            } else {
                return BehaviorResult.FAILURE;
            }
            return BehaviorResult.INPROGRESS;
        }

        return (result === OK) ? BehaviorResult.INPROGRESS : BehaviorResult.FAILURE;
    }
}

export const moveTo = (pos: RoomPosition, range = 1) => {
    return Sequence(
        setMoveTarget(pos, range),
        moveToTarget()
    )
}

export const ifIsInRoom = (roomName: string) => {
    return (creep: CachedCreep) => (creep.pos.roomName === roomName) ? BehaviorResult.SUCCESS: BehaviorResult.FAILURE
}
