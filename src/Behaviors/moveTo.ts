import { BehaviorResult } from "Behaviors/Behavior";
import { calculateNearbyPositions, getCostMatrix, isPositionWalkable } from "Selectors/MapCoordinates";
import { getTerritoryIntent, TerritoryIntent } from "Selectors/territoryIntent";
import { packPos } from "utils/packrat";
import profiler from "utils/profiler";


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
        let positionsInRange = calculateNearbyPositions(this.pos, this.range, true)
                                         .filter(pos => isPositionWalkable(pos, true));
        // console.log(creep.name, `calculatePath: ${positionsInRange.length} squares in range ${this.range} of ${this.pos}`);
        if (positionsInRange.length === 0) throw new Error('No valid targets for path');
        // Calculate path in rooms first
        let rooms = [creep.pos.roomName];
        if (creep.pos.roomName !== this.pos.roomName) {
            let roomsRoute = Game.map.findRoute(
                creep.pos.roomName,
                this.pos.roomName,
                {
                    routeCallback: (roomName, fromRoomName) => {
                        if (
                            roomName !== this.pos.roomName &&
                            getTerritoryIntent(roomName) === TerritoryIntent.AVOID
                        ) return Infinity;
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
                return getCostMatrix(room, avoidCreeps)
            },
            plainCost: 2,
            swampCost: 10,
            maxOps: 2000 * rooms.length
        })
        if (!route || route.incomplete) throw new Error('Unable to plan route');
        // log(creep.name, `calculatePath: ${route.cost} (complete: ${!route.incomplete})`);
        this.path = route.path;
        this.lastPos = creep.pos;
    }

    run(creep: Creep) {
        if (this.recalculatedPath > 2 || !this.path) {
            return ERR_NO_PATH;
        }
        this.stuckForTicks = (this.lastPos && creep.pos.isEqualTo(this.lastPos)) ? this.stuckForTicks + 1 : 0;
        // log(creep.name, `Route.run: ${creep.pos} (was ${this.lastPos})`);
        if (this.stuckForTicks > 2) {
            // log(creep.name, `Route.run: stuck for ${this.stuckForTicks}, recalculating`);
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

// profiler.registerClass(Route, 'Route');

declare global {
    interface CreepMemory {
        movePos?: string,
        moveRange?: number,
    }
}

let Routes: Record<string, Route> = {};

export const moveTo = profiler.registerFN((pos?: RoomPosition, range = 1) => {
    return (creep: Creep) => {
        if (!pos) return BehaviorResult.FAILURE;

        // Set target position for excuseMe
        creep.memory.movePos = packPos(pos);
        creep.memory.moveRange = range;

        // If we're in range, move is done
        if (creep.pos.inRangeTo(pos, range)) {
            return BehaviorResult.SUCCESS;
        }

        // Plan route, if necessary
        if (!Routes[creep.name]) {
            try {
                Routes[creep.name] = new Route(creep, pos, range);
            } catch {
                return BehaviorResult.FAILURE;
            }
        }

        // Move along route
        try {
            let result = Routes[creep.name].run(creep);
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
                    creep.memory.movePos = undefined;
                    creep.memory.moveRange = undefined;
                    delete Routes[creep.name];
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
        catch (e) {
            // Whether error encountered or execution fell through, the path failed
            // console.log(e);
            creep.memory.movePos = undefined;
            creep.memory.moveRange = undefined;
            delete Routes[creep.name];
            return BehaviorResult.FAILURE;
        }
    }
}, 'moveTo')
