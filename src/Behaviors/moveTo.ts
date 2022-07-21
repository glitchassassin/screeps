import { BehaviorResult } from "Behaviors/Behavior";
import { terrainCosts } from "Selectors/Map/MapCoordinates";
import { getCostMatrix } from "Selectors/Map/Pathing";
import { getTerritoryIntent, TerritoryIntent } from "Selectors/territoryIntent";
import { packPos } from "utils/packrat";


export class Route {
    lastPos?: RoomPosition;
    path?: RoomPosition[];
    pathRoom?: string;
    rooms: string[] = [];
    stuckForTicks: number = 0;
    recalculatedPath: number = 0;

    constructor(
        creep: Creep,
        public key: string,
        public targets: MoveTarget[],
        public opts?: MoveToOpts
    ) {
        this.calculateRoute(creep);
        this.calculatePathToRoom(creep);
    }

    calculateRoute(creep: Creep) {
        this.rooms = [creep.pos.roomName];
        let bestRoute: string[]|undefined = undefined;
        let bestRouteLength = Infinity;
        for (const target of this.targets) {
            if (creep.pos.roomName === target.pos.roomName) {
                return; // At least one target is in this room
            }
            let roomsRoute = Game.map.findRoute(
                creep.pos.roomName,
                target.pos.roomName,
                {
                    routeCallback: (roomName) => {
                        if (
                            roomName !== target.pos.roomName &&
                            roomName !== creep.pos.roomName &&
                            getTerritoryIntent(roomName) === TerritoryIntent.AVOID
                        ) return Infinity;
                        return 1;
                    }
                }
            )
            if (roomsRoute === ERR_NO_PATH) continue;
            if (roomsRoute.length < bestRouteLength) {
                bestRoute = roomsRoute.map(r => r.room);
                bestRouteLength = roomsRoute.length;
            }
        }
        if (!bestRoute) throw new Error(`No valid room path ${creep.pos.roomName} - [${this.targets.map(t => t.pos.roomName).join(',')}]`);
        this.rooms = this.rooms.concat(bestRoute);
        this.pathRoom = this.rooms[1];
    }

    calculatePathToRoom(creep: Creep, avoidCreeps = false, recalculated = false) {
        const nextRoom = this.rooms[this.rooms.indexOf(creep.room.name) + 1];
        if (!nextRoom) {
            this.calculatePath(creep, this.targets, avoidCreeps);
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
        this.calculatePath(creep, creep.room.find(exit).map(pos => ({pos, range: 0})), avoidCreeps);
    }

    calculatePath(creep: Creep, positionsInRange: MoveTarget[], avoidCreeps = false) {
        let route = PathFinder.search(creep.pos, positionsInRange, {
            roomCallback: (room) => {
                if (!this.rooms?.includes(room)) return false;
                return getCostMatrix(room, avoidCreeps, { stayInsidePerimeter: this.opts?.stayInsidePerimeter })
            },
            ...terrainCosts(creep),
            maxRooms: 1,
            flee: this.opts?.flee
        })
        if (!route || route.incomplete) throw new Error(`Unable to plan route ${creep.pos} ${positionsInRange}`);

        this.path = route.path;
        this.lastPos = creep.pos;
    }

    pathComplete(creep: Creep) {
        if (this.opts?.flee) {
            return !this.targets.some(target => creep.pos.getRangeTo(target.pos) <= target.range)
        }
        return this.targets.some(target => creep.pos.getRangeTo(target.pos) <= target.range)
    }

    run(creep: Creep) {
        if (this.pathComplete(creep)) return OK;

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
            Game.map.visual.poly(this.path, { lineStyle: 'dotted', stroke: '#fff' });
        }
        rooms.forEach(room => {
            // Technically this could cause weirdness if the road loops out of a room
            // and then back into it. If that happens, we'll just need to parse this
            // into segments a little more intelligently
            if (!this.path) return;
            new RoomVisual(room).poly(this.path.filter(pos => pos.roomName === room), { lineStyle: 'dotted', stroke: '#fff' });
        })
    }
}

// profiler.registerClass(Route, 'Route');

declare global {
    interface CreepMemory {
        moveTargets?: {
            pos: string,
            range: number
        }[]
    }
}

let Routes: Record<string, Route> = {};

interface MoveTarget {
    pos: RoomPosition,
    range: number
}
interface MoveToOpts extends globalThis.MoveToOpts {
    flee?: boolean,
    stayInsidePerimeter?: boolean,
}

export function moveTo(creep: Creep, targetOrTargets: _HasRoomPosition | RoomPosition | MoveTarget | MoveTarget[], opts?: MoveToOpts | undefined) {
    const targets: MoveTarget[] = [];
    if ('range' in targetOrTargets) { // MoveTarget
        targets.push(targetOrTargets);
    } else if ('pos' in targetOrTargets) { // _HasRoomPosition
        targets.push({
            pos: targetOrTargets.pos,
            range: opts?.range ?? 0 // default range
        })
    } else if ('x' in targetOrTargets) { // RoomPosition
        targets.push({
            pos: targetOrTargets,
            range: opts?.range ?? 0 // default range
        })
    } else { // MoveTarget[]
        targets.push(...targetOrTargets);
    }

    // If the creep is in range of a move target, it does not need to move
    // If target has exactly one target, it is there, and it has range 0, then it does "need to move" to avoid being shoved
    const needsToMove = opts?.flee ?
        targets.some(target => creep.pos.getRangeTo(target.pos) <= target.range) :
        !targets.some(target => creep.pos.getRangeTo(target.pos) <= target.range)
    if (!targets) return BehaviorResult.FAILURE;

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
    if (!needsToMove) {
        delete Routes[creep.name]
        return BehaviorResult.SUCCESS;
    }

    // Set target position for excuseMe
    Memory.creeps[creep.name].moveTargets = targets.map(t => ({ pos: packPos(t.pos), range: t.range }));

    const key = targets.map(t => packPos(t.pos)).join();

    // Plan route, if necessary
    if (!Routes[creep.name] || Routes[creep.name].key !== key) {
        try {
            Routes[creep.name] = new Route(creep, key, targets, opts);
        } catch (e) {
            return BehaviorResult.FAILURE;
        }
    }

    // Move along route
    try {
        let result = Routes[creep.name].run(creep);
        if (result === ERR_NOT_FOUND) {
            creep.memory.moveTargets = undefined;
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
        creep.memory.moveTargets = undefined;
        delete Routes[creep.name];
        return BehaviorResult.FAILURE;
    }
}
