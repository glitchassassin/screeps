import { ControllerAnalyst } from 'Boardroom/BoardroomManagers/ControllerAnalyst';
import { FacilitiesManager } from './FacilitiesManager';
import { HRAnalyst } from 'Boardroom/BoardroomManagers/HRAnalyst';
import { OfficeManager } from 'Office/OfficeManager';
import { SalesAnalyst } from 'Boardroom/BoardroomManagers/SalesAnalyst';
import profiler from 'screeps-profiler';

export class Road {
    path: RoomPosition[] = [];

    constructor(path: RoomPosition[]) {
        this.path = path.filter(pos => !(
            pos.x === 0  || // Eliminate room exits
            pos.x === 49 ||
            pos.y === 0  ||
            pos.y === 49
        ));
    }
}

const roadPlannerCallback = (roomName: string) => {
    let room = Game.rooms[roomName];
    if (!room) return false;
    let costs = new PathFinder.CostMatrix();

    room.find(FIND_STRUCTURES).forEach(s => {
        if (s.structureType === STRUCTURE_ROAD) {
            costs.set(s.pos.x, s.pos.y, 1); // Already a road here, prefer this
        } else if (s.structureType !== STRUCTURE_RAMPART) {
            costs.set(s.pos.x, s.pos.y, 0xff); // Anything but a rampart, build around it
        }
    })

    return costs;
}

export class RoadArchitect extends OfficeManager {
    roads: Road[] = []

    plan() {
        // Only re-check infrastructure every `n` ticks (saves CPU)
        if (this.roads.length !== 0 && Game.time % 200 !== 0) return;
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        let controllerAnalyst = global.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;

        // Draw roads between spawn, sources, and controllers
        let spawn = hrAnalyst.getSpawns(this.office)[0];
        let controller = global.worldState.controllers.byRoom.get(this.office.name);
        if (!spawn || !controller) return;
        salesAnalyst.getUsableSourceLocations(this.office).forEach(franchise => {
            this.roads.push(new Road(PathFinder.search(spawn.pos, franchise.pos, {
                plainCost: 2,
                swampCost: 2,
                maxOps: 3000,
                roomCallback: roadPlannerCallback
            }).path))
        })
        controllerAnalyst.getReservingControllers(this.office).forEach(c => {
            if (!c.pos) return;
            this.roads.push(new Road(PathFinder.search(spawn.pos, c.pos, {
                plainCost: 2,
                swampCost: 2,
                maxOps: 3000,
                roomCallback: roadPlannerCallback
            }).path))
        })
        this.roads.push(new Road(PathFinder.search(spawn.pos, controller.pos as RoomPosition, {
            plainCost: 2,
            swampCost: 2,
            maxOps: 3000,
            roomCallback: roadPlannerCallback
        }).path))
        this.roads.sort((a, b) => a.path.length - b.path.length);
    }

    run() {
        // Architect only renders if enabled and roads are not built
        if (global.v.roads.state) {
            this.roads.forEach(road => {
                let strokeWidth = 0.05
                let rooms = road.path.reduce((r, pos) => (r.includes(pos.roomName) ? r : [...r, pos.roomName]), [] as string[])
                rooms.forEach(room => {
                    // Technically this could cause weirdness if the road loops out of a room
                    // and then back into it. If that happens, we'll just need to parse this
                    // into segments a little more intelligently
                    new RoomVisual(room).poly(road.path.filter(pos => pos.roomName === room), {lineStyle: 'dashed', stroke: '#0f0', strokeWidth});
                })
            })
        }
    }
}
profiler.registerClass(RoadArchitect, 'RoadArchitect');
