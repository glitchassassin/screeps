import { Transform } from 'class-transformer';
import { Office } from 'Office/Office';
import { transformRoomPosition } from 'utils/transformGameObject';
import { Architect } from './Architect';

export class Road {
    @Transform(transformRoomPosition)
    path: RoomPosition[] = [];

    status: "PENDING"|"INPROGRESS"|"DONE" = "PENDING";

    constructor(path: RoomPosition[]) {
        this.path = path;
    }

    isBuilt() {
        if (this.path.every(pos => pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType === STRUCTURE_ROAD).length > 0)) {
            this.status = "DONE";
        }
        return (this.status === "DONE")
    }
    build() {
        this.path.forEach(pos => pos.createConstructionSite(STRUCTURE_ROAD));
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

export class RoadArchitect extends Architect {
    roads: Road[] = []

    plan(office: Office) {
        // Only re-check infrastructure every `n` ticks (saves CPU)
        if (this.roads.length !== 0 && Game.time % 50 !== 0) return;

        if (this.roads.length === 0) {
            // Draw roads between spawn and sources
            let spawn = global.analysts.spawn.getSpawns(office)[0];
            global.analysts.sales.getFranchiseLocations(office).forEach(franchise => {
                this.roads.push(new Road(PathFinder.search(spawn.pos, franchise.pos, {
                    swampCost: 1,
                    maxOps: 3000,
                    roomCallback: roadPlannerCallback
                }).path))
            })
        }

        let road = this.roads.sort((a, b) => a.path.length - b.path.length).find(road => road.status !== "DONE");
        if (road?.status === "PENDING") {
            road.build();
        }
    }
}
