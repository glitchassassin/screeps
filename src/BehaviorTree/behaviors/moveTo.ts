import { BehaviorResult, Blackboard, Sequence } from "BehaviorTree/Behavior";

import { Controllers } from "WorldState/Controllers";
import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";
import { log } from "utils/logger";
import profiler from "screeps-profiler";

export class Route {
    lastPos?: RoomPosition;
    path?: RoomPosition[];
    stuckForTicks: number = 0;
    recalculatedPath: number = 0;

    constructor(
        creep: Creep,
        public pos: RoomPosition,
        public range: number = 1
    ) {
        this.calculatePath(creep);
    }

    calculatePath(creep: Creep, avoidCreeps = false) {
        let mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst
        let positionsInRange = mapAnalyst.calculateNearbyPositions(this.pos, this.range, true)
                                         .filter(pos => mapAnalyst.isPositionWalkable(pos, false));
        log(creep.name, `calculatePath: ${positionsInRange.length} squares in range ${this.range} of ${this.pos}`);
        // Calculate path in rooms first
        let rooms = [creep.pos.roomName];
        if (creep.pos.roomName !== this.pos.roomName) {
            let roomsRoute = Game.map.findRoute(
                creep.pos.roomName,
                this.pos.roomName,
                {
                    routeCallback(roomName, fromRoomName) {
                        let controller = Controllers.byRoom(roomName);
                        if (controller && controller.owner && !controller.my) return Infinity;
                        return 1;
                    }
                }
            )
            if (roomsRoute === ERR_NO_PATH) {
                this.path = [];
                return;
            }
            rooms.push(...roomsRoute.map(r => r.room));
        }


        let route = PathFinder.search(creep.pos, positionsInRange, {
            roomCallback: (room) => {
                if (!rooms.includes(room)) return false;
                return mapAnalyst.getCostMatrix(room, avoidCreeps)
            },
            plainCost: 2,
            swampCost: 10,
            maxOps: 2000 * rooms.length
        })
        if (!route || route.incomplete) throw new Error('Unable to plan route');
        log(creep.name, `calculatePath: ${route.cost} (complete: ${!route.incomplete})`);
        this.path = route.path;
        this.lastPos = creep.pos;
    }

    run(creep: Creep) {
        if (this.recalculatedPath > 2 || !this.path) {
            return ERR_NO_PATH;
        }
        this.stuckForTicks = (this.lastPos && creep.pos.isEqualTo(this.lastPos)) ? this.stuckForTicks + 1 : 0;
        log(creep.name, `Route.run: ${creep.pos} (was ${this.lastPos})`);
        if (this.stuckForTicks > 2) {
            log(creep.name, `Route.run: stuck for ${this.stuckForTicks}, recalculating`);
            this.recalculatedPath += 1;
            this.calculatePath(creep, true);
        }
        this.lastPos = creep.pos;
        let result = creep.moveByPath(this.path);
        if (result === ERR_TIRED) {
            this.stuckForTicks = 0;
            return OK;
        }
        return result;
    }
    visualize() {
        if (!this.path) return;
        let rooms = this.path.reduce((r, pos) => (r.includes(pos.roomName) ? r : [...r, pos.roomName]), [] as string[])
        if (rooms.length > 1) {
            Game.map.visual.poly(this.path, {lineStyle: 'dotted', stroke: '#fff'});
        }
        rooms.forEach(room => {
            // Technically this could cause weirdness if the road loops out of a room
            // and then back into it. If that happens, we'll just need to parse this
            // into segments a little more intelligently
            if (!this.path) return;
            new RoomVisual(room).poly(this.path.filter(pos => pos.roomName === room), {lineStyle: 'dotted', stroke: '#fff'});
        })
    }
}

profiler.registerClass(Route, 'Route');

declare module 'BehaviorTree/Behavior' {
    interface Blackboard {
        movePos?: RoomPosition,
        moveRange?: number,
        moveRoute?: Route,
        moveDone?: boolean
    }
}

export const resetMoveTarget = () => {
    return (creep: Creep, bb: Blackboard) => {
        bb.movePos = undefined;
        bb.moveRange = undefined;
        bb.moveRoute = undefined;
        bb.moveDone = undefined;
        return BehaviorResult.SUCCESS;
    }
}

export const setMoveTarget = (pos?: RoomPosition, range = 1) => {
    return (creep: Creep, bb: Blackboard) => {
        if (!pos) return BehaviorResult.FAILURE;
        if (bb.moveDone === false) {
            // Move in progress and locked in
            return BehaviorResult.SUCCESS
        }
        if (creep.pos.inRangeTo(pos, range)) {
            bb.moveDone = true;
            return BehaviorResult.SUCCESS;
        }

        log(creep.name, `setMoveTarget: range ${range} of ${pos}`);

        try {
            log(creep.name, `setMoveTarget: calculating new Route`);
            bb.movePos = pos;
            bb.moveRange = range;
            bb.moveRoute = new Route(creep, pos, range);
            bb.moveDone = false;
        }
        catch {
            log(creep.name, `setMoveTarget: failed to calculate Route`);
            return BehaviorResult.FAILURE;
        }
        return BehaviorResult.SUCCESS;
    }
}

export const setMoveTargetFromBlackboard = (range = 1) => {
    return (creep: Creep, bb: Blackboard) => {
        log(creep.name, `setMoveTargetFromBlackboard: ${bb.targetPos}`);
        if (!bb.targetPos) return BehaviorResult.FAILURE;
        return setMoveTarget(bb.targetPos, range)(creep, bb);
    }
}

export const moveToTarget = () => {
    return (creep: Creep, bb: Blackboard) => {
        if (!bb.movePos || bb.moveRange === undefined) return BehaviorResult.FAILURE;
        if (bb.moveDone) {
            return BehaviorResult.SUCCESS;
        }
        if (!bb.moveRoute) return BehaviorResult.FAILURE;

        if (global.debug[creep.name]) bb.moveRoute.visualize();

        try {
            let result = bb.moveRoute.run(creep);
            log(creep.name, `moveToTarget: ${bb.moveRange} squares of ${bb.movePos} (${result})`)
            if (result === ERR_NOT_FOUND) {
                if (creep.pos.x === 0) {
                    creep.move(RIGHT);
                } else if (creep.pos.x === 49) {
                    creep.move(LEFT);
                } else if (creep.pos.y === 0) {
                    creep.move(BOTTOM);
                } else if (creep.pos.y === 49) {
                    creep.move(TOP);
                } else {
                    bb.movePos = undefined;
                    bb.moveRange = undefined;
                    bb.moveRoute = undefined;
                    bb.moveDone = undefined;
                    return BehaviorResult.FAILURE;
                }
                return BehaviorResult.INPROGRESS;
            }
            else if (result === OK) {
                return BehaviorResult.INPROGRESS;
            }
            else {
                throw new Error(`Error running route: ${result}`);
            }
        }
        catch {
            log(creep.name, `moveToTarget: ${bb.movePos} path failed`)
            // Whether error encountered or execution fell through, the path failed
            bb.movePos = undefined;
            bb.moveRange = undefined;
            bb.moveRoute = undefined;
            bb.moveDone = undefined;
            return BehaviorResult.FAILURE;
        }
    }
}

export const moveTo = (pos?: RoomPosition, range = 1) => {
    return Sequence(
        setMoveTarget(pos, range),
        moveToTarget()
    )
}

export const ifIsInRoom = (roomName: string) => {
    return (creep: Creep) => {
        return (creep.pos.roomName === roomName) ? BehaviorResult.SUCCESS: BehaviorResult.FAILURE
    }
}
