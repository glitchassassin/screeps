import { MapAnalyst } from "Boardroom/BoardroomManagers/MapAnalyst";

class Route {
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
        let mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst;
        let route = PathFinder.search(creep.pos, {pos: this.pos, range: this.range}, {
            roomCallback: (room) => mapAnalyst.getCostMatrix(room, avoidCreeps)
        })
        this.path = route.path;
        this.lastPos = creep.pos;
    }

    run(creep: Creep) {
        if (this.recalculatedPath > 2 || !this.path) return ERR_NO_PATH;
        this.stuckForTicks = (this.lastPos && creep.pos.isEqualTo(this.lastPos)) ? this.stuckForTicks + 1 : 0;
        if (this.stuckForTicks > 2) {
            this.recalculatedPath += 1;
            this.calculatePath(creep, true);
        }
        this.lastPos = creep.pos;
        let result = creep.moveByPath(this.path);
        return (result === ERR_TIRED) ? OK : result;
    }
}

let routeCache = new Map<Id<Creep>, Route>()

export const travel = (creep: Creep, pos: RoomPosition, range: number = 1) => {
    let routeKey = creep.id;

    let route = routeCache.get(routeKey);
    if (!route || !pos.isEqualTo(route.pos)) {
        route = new Route(creep, pos, range);
        routeCache.set(routeKey, route);
    }

    return route.run(creep);
}
