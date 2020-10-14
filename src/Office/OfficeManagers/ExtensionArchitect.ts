import { OfficeManager } from 'Office/OfficeManager';
import profiler from 'screeps-profiler';

class ExtensionBlock {
    center: RoomPosition

    status: "PENDING"|"INPROGRESS"|"DONE" = "PENDING";

    constructor(center: RoomPosition) {
        this.center = center;
    }

    checkIfBuilt() {
        if (this.path.every(
            pos => Game.rooms[pos.roomName] &&
            pos.lookFor(LOOK_STRUCTURES).filter(s => s.structureType === STRUCTURE_ROAD || s.structureType === STRUCTURE_CONTAINER).length > 0
        )) {
            this.status = "DONE";
        }
        return (this.status === "DONE")
    }
    build() {
        this.path.forEach(pos => pos.createConstructionSite(STRUCTURE_ROAD));
        this.status = "INPROGRESS";
    }
}

export class ExtensionArchitect extends OfficeManager {
    extensions: ExtensionBlock[] = [];

    plan() {
        // Only re-check infrastructure every `n` ticks (saves CPU)

    }

    run() {
        // Architect only renders if enabled and roads are not built
        if (global.v.roads.state) {
            this.roads.forEach(road => {
                if (road.status === 'DONE') return;
                let rooms = road.path.reduce((r, pos) => (r.includes(pos.roomName) ? r : [...r, pos.roomName]), [] as string[])
                rooms.forEach(room => {
                    // Technically this could cause weirdness if the road loops out of a room
                    // and then back into it. If that happens, we'll just need to parse this
                    // into segments a little more intelligently
                    new RoomVisual(room).poly(road.path.filter(pos => pos.roomName === room), {lineStyle: 'dashed', stroke: '#0f0'});
                })
            })
        }
    }
}
profiler.registerClass(ExtensionArchitect, 'ExtensionArchitect');
