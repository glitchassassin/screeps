import { lazyCount, lazyFilter } from 'utils/lazyIterators';

import { BuildRequest } from 'BehaviorTree/requests/Build';
import { FacilitiesManager } from '../FacilitiesManager';
import { MinionRequest } from 'BehaviorTree/requests/MinionRequest';
import { OfficeManager } from 'Office/OfficeManager';
import { getRcl } from 'utils/gameObjectSelectors';
import profiler from 'screeps-profiler';

let LIMITS: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 2,
    6: 3,
    7: 4,
    8: 6
}

class LinkBlock {
    request?: MinionRequest;

    generateRequests() {
        if (this.center.lookFor(LOOK_STRUCTURES).some(s => s.structureType === STRUCTURE_LINK)) {
            return;
        }

        if (this.request && !this.request.result) return; // request in progress
        if (lazyCount(lazyFilter(
                global.worldState.structures.byRoom.get(this.center.roomName) ?? [],
                structure => structure.structureType === STRUCTURE_LINK
            )) >= LIMITS[getRcl(this.center.roomName) ?? 1]) {
            return; // No more Links may be constructed
        }

        this.request = new BuildRequest(this.center, STRUCTURE_LINK);
        return this.request;
    }

    constructor(public center: RoomPosition) { }
}

export class LinkArchitect extends OfficeManager {
    links: LinkBlock[] = [];

    plan() {
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;
        // Only re-check infrastructure every `n` ticks (saves CPU)
        if (this.links.length !== 0 && Game.time % 200 !== 0) return;
        let controller = global.worldState.controllers.byRoom.get(this.office.name);
        if (!controller || controller.level < 2) return;

        this.links = [];
        for (let flag in Game.flags) {
            if (this.links.length >= LIMITS[getRcl(this.office.name) ?? 1]) break; // No more Links may be constructed
            if (Game.flags[flag].color === COLOR_CYAN) {
                let block = new LinkBlock(Game.flags[flag].pos)
                this.links.push(block);
                let request = block.generateRequests();
                if (request) facilitiesManager.submit(request);
            }
        }
    }

    run() {
        if (global.v.planning.state) {
            this.links.forEach(link => {
                new RoomVisual(link.center.roomName).poly(
                    [
                        [link.center.x + 0.5, link.center.y],
                        [link.center.x, link.center.y + 0.5],
                        [link.center.x - 0.5, link.center.y],
                        [link.center.x, link.center.y - 0.5],
                        [link.center.x + 0.5, link.center.y],
                    ],
                    {fill: 'transparent', stroke: '#f00', strokeWidth: 0.1}
                );
            })
        }
    }
}
profiler.registerClass(LinkArchitect, 'LinkArchitect');
