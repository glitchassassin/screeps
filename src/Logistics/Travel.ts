import { MapAnalyst } from "Analysts/MapAnalyst";
import { log } from "utils/logger";

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
        let positionsInRange = MapAnalyst.calculateNearbyPositions(this.pos, this.range, true)
                                         .filter(pos => MapAnalyst.isPositionWalkable(pos, !avoidCreeps));
        let route = PathFinder.search(creep.pos, positionsInRange, {
            roomCallback: (room) => MapAnalyst.getCostMatrix(room, avoidCreeps),
            plainCost: 2,
            swampCost: 10
        })
        this.path = route.path;
        this.lastPos = creep.pos;
    }

    run(creep: Creep) {
        if (this.recalculatedPath > 2 || !this.path) {
            return ERR_NO_PATH;
        }
        this.stuckForTicks = (this.lastPos && creep.pos.isEqualTo(this.lastPos)) ? this.stuckForTicks + 1 : 0;
        if (this.stuckForTicks > 2) {
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
        rooms.forEach(room => {
            // Technically this could cause weirdness if the road loops out of a room
            // and then back into it. If that happens, we'll just need to parse this
            // into segments a little more intelligently
            if (!this.path) return;
            new RoomVisual(room).poly(this.path.filter(pos => pos.roomName === room), {lineStyle: 'dotted', stroke: '#fff'});
        })
    }
}

let routeCache = new Map<string, Route>()

export const travel = (creep: Creep, pos: RoomPosition, range: number = 1) => {
    let routeKey = creep.name;

    let route = routeCache.get(routeKey);
    if (!route || !pos.isEqualTo(route.pos)) {
        log('Travel', 'Generating new route');
        route = new Route(creep, pos, range);
        routeCache.set(routeKey, route);
    }

    log('Travel', `${creep.name} traveling`);
    route.visualize();
    let result = route.run(creep);
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
            return result;
        }
        routeCache.delete(routeKey);
        return OK;
    } else if (result !== OK) {
        routeCache.delete(routeKey);
    }
    log('Travel', `${creep.name} result: ${result}`);
    return result;
}
