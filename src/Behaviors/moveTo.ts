import { BehaviorResult } from "Behaviors/Behavior";
import { calculateNearbyPositions, getCostMatrix, isPositionWalkable } from "Selectors/MapCoordinates";
import { getTerritoryIntent, TerritoryIntent } from "Selectors/territoryIntent";
import { packPos } from "utils/packrat";
import profiler from "utils/profiler";


export class Route {
    lastPos?: RoomPosition;
    path?: RoomPosition[];
    pathRoom?: string;
    rooms: string[] = [];
    stuckForTicks: number = 0;
    recalculatedPath: number = 0;

    constructor(
        creep: Creep,
        public pos: RoomPosition,
        public range: number = 1
    ) {
        this.calculateRoute(creep);
        this.calculatePathToRoom(creep);
    }

    calculateRoute(creep: Creep) {
        this.rooms = [creep.pos.roomName];
        if (creep.pos.roomName !== this.pos.roomName) {
            let roomsRoute = Game.map.findRoute(
                creep.pos.roomName,
                this.pos.roomName,
                {
                    routeCallback: (roomName) => {
                        if (
                            roomName !== this.pos.roomName &&
                            roomName !== creep.pos.roomName &&
                            getTerritoryIntent(roomName) === TerritoryIntent.AVOID
                        ) return Infinity;
                        return 1;
                    }
                }
            )
            if (roomsRoute === ERR_NO_PATH) throw new Error(`No valid room path ${creep.pos.roomName} - ${this.pos.roomName}`);
            this.rooms = this.rooms.concat(roomsRoute.map(r => r.room));
            this.pathRoom = this.rooms[1];
        }
    }

    calculatePathToRoom(creep: Creep, avoidCreeps = false, recalculated = false) {
        const nextRoom = this.rooms[this.rooms.indexOf(creep.room.name) + 1];
        if (!nextRoom) {
            // We are in the target room
            let positionsInRange = calculateNearbyPositions(this.pos, this.range, true)
                                         .filter(pos =>
                                            isPositionWalkable(pos, true) &&
                                            pos.x > 0 && pos.x < 49 &&
                                            pos.y > 0 && pos.y < 49
                                        );
            // console.log(creep.name, `calculatePath: ${positionsInRange.length} squares in range ${this.range} of ${this.pos}`);
            if (positionsInRange.length === 0) throw new Error('No valid targets for path');
            this.calculatePath(creep, positionsInRange, avoidCreeps);
            return;
        }
        const exit = creep.room.findExitTo(nextRoom);
        if (exit === ERR_NO_PATH || exit === ERR_INVALID_ARGS) {
            if (!recalculated) {
                this.calculateRoute(creep);
                this.calculatePathToRoom(creep, avoidCreeps, true)
                return;
            } else {
                throw new Error('Unable to follow route')
            }
        }
        this.pathRoom = nextRoom;
        this.calculatePath(creep, creep.room.find(exit), avoidCreeps);
    }

    calculatePath(creep: Creep, positionsInRange: RoomPosition[], avoidCreeps = false) {
        let route = PathFinder.search(creep.pos, positionsInRange, {
            roomCallback: (room) => {
                if (!this.rooms?.includes(room)) return false;
                return getCostMatrix(room, avoidCreeps)
            },
            plainCost: 2,
            swampCost: 10,
            maxRooms: 1,
        })
        if (!route || route.incomplete) throw new Error(`Unable to plan route ${creep.pos} ${positionsInRange}`);

        this.path = route.path;
        this.lastPos = creep.pos;
    }

    run(creep: Creep) {
        if (creep.pos.inRangeTo(this.pos, this.range)) return OK;

        if (creep.pos.roomName === this.pathRoom) {
            this.calculatePathToRoom(creep);
        }

        if (this.recalculatedPath > 2 || !this.path) {
            return ERR_NO_PATH;
        }
        this.stuckForTicks = (this.lastPos && creep.pos.isEqualTo(this.lastPos)) ? this.stuckForTicks + 1 : 0;
        // log(creep.name, `Route.run: ${creep.pos} (was ${this.lastPos})`);
        if (this.stuckForTicks > 2) {
            // log(creep.name, `Route.run: stuck for ${this.stuckForTicks}, recalculating`);
            this.recalculatedPath += 1;
            this.calculatePathToRoom(creep, true);
            this.stuckForTicks = 0;
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

        if (creep.pos.x === 0) {
            creep.move(RIGHT);
            return BehaviorResult.INPROGRESS;
        } else if (creep.pos.x === 49) {
            creep.move(LEFT);
            return BehaviorResult.INPROGRESS;
        } else if (creep.pos.y === 0) {
            creep.move(BOTTOM);
            return BehaviorResult.INPROGRESS;
        } else if (creep.pos.y === 49) {
            creep.move(TOP);
            return BehaviorResult.INPROGRESS;
        }

        // If we're in range, move is done
        if (creep.pos.inRangeTo(pos, range)) {
            delete Routes[creep.name]
            return BehaviorResult.SUCCESS;
        }

        // Set target position for excuseMe
        Memory.creeps[creep.name].movePos = packPos(pos);
        Memory.creeps[creep.name].moveRange = range;

        // Plan route, if necessary
        if (!Routes[creep.name] || !Routes[creep.name].pos.isEqualTo(pos)) {
            try {
                Routes[creep.name] = new Route(creep, pos, range);
            } catch (e) {
                // console.log(e)
                return BehaviorResult.FAILURE;
            }
        }

        // Move along route
        try {
            let result = Routes[creep.name].run(creep);
            if (result === ERR_NOT_FOUND) {
                creep.memory.movePos = undefined;
                creep.memory.moveRange = undefined;
                delete Routes[creep.name];
                // console.log('ERR_NOT_FOUND')
                return BehaviorResult.FAILURE;
            } else if (result === OK) {
                return BehaviorResult.INPROGRESS;
            } else {
                throw new Error(`Error running route: ${result}`);
            }
        } catch (e) {
            // Whether error encountered or execution fell through, the path failed
            // console.log(e);
            creep.memory.movePos = undefined;
            creep.memory.moveRange = undefined;
            delete Routes[creep.name];
            return BehaviorResult.FAILURE;
        }
    }
}, 'moveTo')
