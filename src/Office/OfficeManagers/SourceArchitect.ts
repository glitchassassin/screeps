import { Franchise, SalesAnalyst } from 'Boardroom/BoardroomManagers/SalesAnalyst';
import { OfficeManager } from 'Office/OfficeManager';
import profiler from 'screeps-profiler';

export class SourceArchitect extends OfficeManager {
    franchises: Franchise[] = [];
    setupComplete = false;
    plan() {
        // Only re-check infrastructure every `n` ticks after setup is complete (saves CPU)
        // if (this.setupComplete && Game.time % 50 !== 0) return;
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;

        this.franchises = salesAnalyst.getFranchiseLocations(this.office);

        if (this.office.center.room.controller?.level && this.office.center.room.controller.level > 1) {
            // When available, lay out containers on mining locations
            this.franchises.forEach(mine => {
                if (Game.rooms[mine.pos.roomName] && !mine.container && !mine.constructionSite) {
                    mine.pos.createConstructionSite(STRUCTURE_CONTAINER);
                }
            })
            this.setupComplete = true;
        }
    }

    run() {
        if (global.v.franchises.state) {
            this.franchises.forEach(franchise => {
                new RoomVisual(franchise.sourcePos.roomName).rect(franchise.sourcePos.x-2, franchise.sourcePos.y-2, 4, 4, {stroke: '#0f0', fill: 'transparent'})
                new RoomVisual(franchise.pos.roomName).circle(franchise.pos, {radius: 1, stroke: '#0f0', fill: 'transparent'})
            })
        }
    }
}
profiler.registerClass(SourceArchitect, 'SourceArchitect');
