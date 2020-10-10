import { HRAnalyst } from 'Boardroom/BoardroomManagers/HRAnalyst';
import { SalesAnalyst } from 'Boardroom/BoardroomManagers/SalesAnalyst';
import { OfficeManager } from 'Office/OfficeManager';

export class Road {
    path: RoomPosition[] = [];

    status: "PENDING"|"INPROGRESS"|"DONE" = "PENDING";

    constructor(path: RoomPosition[]) {
        this.path = path.filter(pos => !(
            pos.x === 0  || // Eliminate room exits
            pos.x === 49 ||
            pos.y === 0  ||
            pos.y === 49
        ));
    }

    checkIfBuilt() {
        let done = 0;
        let inprogress = 0;
        this.path.forEach(pos => {
            if (!Game.rooms[pos.roomName]) return;
            pos.look().forEach(lookItem => {
                if (
                    lookItem.structure?.structureType === STRUCTURE_ROAD ||
                    lookItem.structure?.structureType === STRUCTURE_CONTAINER
                ) {
                    done += 1;
                    return;
                } else if (lookItem.constructionSite?.structureType === STRUCTURE_ROAD) {
                    inprogress += 1
                    return;
                }
            })
        })
        if (done >= this.path.length) {
            this.status = "DONE";
        } else if (done + inprogress >= this.path.length) {
            this.status = "INPROGRESS";
        } else {
            this.status = "PENDING";
        }
        return (this.status === "DONE")
    }
    build() {
        this.path.forEach(pos => Game.rooms[pos.roomName] && pos.createConstructionSite(STRUCTURE_ROAD));
        this.status = "INPROGRESS";
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
        if (this.roads.length !== 0 && Game.time % 50 !== 0) return;
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;

        if (this.roads.length === 0) {
            // Draw roads between spawn and sources
            let spawn = hrAnalyst.getSpawns(this.office)[0];
            salesAnalyst.getFranchiseLocations(this.office).forEach(franchise => {
                this.roads.push(new Road(PathFinder.search(spawn.pos, franchise.pos, {
                    swampCost: 1,
                    maxOps: 3000,
                    roomCallback: roadPlannerCallback
                }).path))
            })
            this.roads.sort((a, b) => a.path.length - b.path.length);
        }
        let inprogress = 0;
        this.roads.forEach(road => {
            if (road.status === 'DONE') return;
            road?.checkIfBuilt();
            if (road.status === 'INPROGRESS') inprogress += 1;
            if (road?.status === 'PENDING' && inprogress === 0) {
                road.build();
                inprogress += 1;
            }
        })
    }

    run() {
        // Architect only renders if enabled and roads are not built
        if (global.v.roads.state) {
            this.roads.forEach(road => {
                if (road.status === 'DONE') return;
                let strokeWidth = (road.status === 'INPROGRESS' ? 0.2 : 0.05)
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
