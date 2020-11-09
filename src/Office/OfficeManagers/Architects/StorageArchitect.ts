import { BuildRequest } from 'BehaviorTree/requests/Build';
import { FacilitiesManager } from '../FacilitiesManager';
import { LogisticsAnalyst } from 'Boardroom/BoardroomManagers/LogisticsAnalyst';
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

class StorageBlock {
    request?: MinionRequest;

    generateRequests() {
        if (this.center.lookFor(LOOK_STRUCTURES).some(s => s.structureType === STRUCTURE_STORAGE)) {
            return;
        }

        if (this.request && !this.request.result) return; // request in progress

        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let office = global.boardroom.offices.get(this.center.roomName);
        if (office && logisticsAnalyst.getStorage(office) && (getRcl(this.center.roomName) ?? 1) < 5) {
            return; // Storage cannot be constructed until RCL 5
        }

        this.request = new BuildRequest(this.center, STRUCTURE_STORAGE);
        return this.request;
    }

    constructor(public center: RoomPosition) { }
}

export class StorageArchitect extends OfficeManager {
    storage?: StorageBlock;
    plan() {
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;
        // Only re-check infrastructure every `n` ticks (saves CPU)
        if (this.storage && Game.time % 200 !== 0) return;

        this.storage = undefined;
        for (let flag in Game.flags) {
            if (this.storage) break; // No more towers may be constructed
            if (Game.flags[flag].color === COLOR_GREEN) {
                this.storage = new StorageBlock(Game.flags[flag].pos)
                let request = this.storage.generateRequests();
                if (request) facilitiesManager.submit(request);
            }
        }
    }

    run() {
    }
}
profiler.registerClass(StorageArchitect, 'StorageArchitect');
