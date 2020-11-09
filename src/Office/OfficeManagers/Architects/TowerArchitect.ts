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
    3: 1,
    4: 1,
    5: 2,
    6: 2,
    7: 3,
    8: 6
}

class TowerBlock {
    request?: MinionRequest;

    generateRequests() {
        if (this.center.lookFor(LOOK_STRUCTURES).some(s => s.structureType === STRUCTURE_TOWER)) {
            return;
        }

        if (this.request && !this.request.result) return; // request in progress
        if (lazyCount(lazyFilter(
                global.worldState.structures.byRoom.get(this.center.roomName) ?? [],
                structure => structure.structureType === STRUCTURE_TOWER
            )) >= LIMITS[getRcl(this.center.roomName) ?? 1]) {
            return; // No more towers may be constructed
        }

        this.request = new BuildRequest(this.center, STRUCTURE_TOWER);
        return this.request;
    }

    constructor(public center: RoomPosition) { }
}

export class TowerArchitect extends OfficeManager {
    towers: TowerBlock[] = [];

    plan() {
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;
        // Only re-check infrastructure every `n` ticks (saves CPU)
        if (this.towers.length !== 0 && Game.time % 200 !== 0) return;
        let controller = global.worldState.controllers.byRoom.get(this.office.name);
        if (!controller || controller.level < 2) return;

        this.towers = [];
        for (let flag in Game.flags) {
            if (this.towers.length >= LIMITS[getRcl(this.office.name) ?? 1]) break; // No more towers may be constructed
            if (Game.flags[flag].color === COLOR_RED) {
                let block = new TowerBlock(Game.flags[flag].pos)
                this.towers.push(block);
                let request = block.generateRequests();
                if (request) facilitiesManager.submit(request);
            }
        }
    }

    run() {
        if (global.v.planning.state) {
            this.towers.forEach(tower => {
                new RoomVisual(tower.center.roomName).line(
                    tower.center.x + 1,
                    tower.center.y,
                    tower.center.x - 1,
                    tower.center.y,
                    {lineStyle: 'solid', color: '#f00', width: 0.5}
                );
                new RoomVisual(tower.center.roomName).line(
                    tower.center.x,
                    tower.center.y + 1,
                    tower.center.x,
                    tower.center.y - 1,
                    {lineStyle: 'solid', color: '#f00', width: 0.5}
                );
            })
        }
    }
}
profiler.registerClass(TowerArchitect, 'TowerArchitect');
