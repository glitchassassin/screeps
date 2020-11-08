import { BuildRequest } from 'BehaviorTree/requests/Build';
import { FacilitiesManager } from '../FacilitiesManager';
import { MapAnalyst } from 'Boardroom/BoardroomManagers/MapAnalyst';
import { MinionRequest } from 'BehaviorTree/requests/MinionRequest';
import { OfficeManager } from 'Office/OfficeManager';
import profiler from 'screeps-profiler';

const EXTENSION_BLOCK_PATTERN = [
    STRUCTURE_ROAD,         STRUCTURE_EXTENSION,    STRUCTURE_ROAD,
    STRUCTURE_EXTENSION,    STRUCTURE_EXTENSION,    STRUCTURE_EXTENSION,
    STRUCTURE_ROAD,         STRUCTURE_EXTENSION,    STRUCTURE_ROAD,
]
class ExtensionBlock {
    requests: MinionRequest[] = [];

    generateRequests() {
        let newRequests: MinionRequest[] = [];
        let mapAnalyst = global.boardroom.managers.get('MapAnalyst') as MapAnalyst;

        let positions = mapAnalyst.calculateNearbyPositions(this.center, 1, true);
        positions.sort((a, b) => {
            let x = b.x - a.x;
            if (x !== 0) return x;
            let y = b.y - a.y;
            return y;
        })

        positions.forEach((pos, i) => {
            if (pos.lookFor(LOOK_STRUCTURES).some(s => s.structureType === EXTENSION_BLOCK_PATTERN[i])) return;

            if (this.requests[i] && !this.requests[i].result) return; // request in progress

            this.requests[i] = new BuildRequest(pos, EXTENSION_BLOCK_PATTERN[i]);
            newRequests.push(this.requests[i]);
        })
        return newRequests;
    }

    constructor(public center: RoomPosition) { }
}

export class ExtensionArchitect extends OfficeManager {
    extensions: ExtensionBlock[] = [];

    plan() {
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;
        // Only re-check infrastructure every `n` ticks (saves CPU)
        if (this.extensions.length !== 0 && Game.time % 200 !== 0) return;
        let controller = global.worldState.controllers.byRoom.get(this.office.name);
        if (!controller || controller.level < 2) return;

        this.extensions = [];
        for (let flag in Game.flags) {
            if (Game.flags[flag].color === COLOR_YELLOW) {
                this.extensions.push(new ExtensionBlock(Game.flags[flag].pos));
            }
        }

        for (let extension of this.extensions) {
            for (let request of extension.generateRequests()) {
                facilitiesManager.submit(request);
            }
        }
    }

    run() {
        if (global.v.extensions.state) {
            this.extensions.forEach(extension => {
                new RoomVisual(extension.center.roomName).line(
                    extension.center.x + 1,
                    extension.center.y,
                    extension.center.x - 1,
                    extension.center.y,
                    {lineStyle: 'solid', color: '#0f0', width: 0.5}
                );
                new RoomVisual(extension.center.roomName).line(
                    extension.center.x,
                    extension.center.y + 1,
                    extension.center.x,
                    extension.center.y - 1,
                    {lineStyle: 'solid', color: '#0f0', width: 0.5}
                );
            })
        }
    }
}
profiler.registerClass(ExtensionArchitect, 'ExtensionArchitect');
