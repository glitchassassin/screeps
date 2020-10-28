import { Office } from 'Office/Office';
import { OfficeManager } from 'Office/OfficeManager';
import { SalesAnalyst } from 'Boardroom/BoardroomManagers/SalesAnalyst';
import profiler from 'screeps-profiler';

export class SourceArchitect extends OfficeManager {
    constructor(
        office: Office,
        private salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst
    ) {
        super(office)
    }
    setupComplete = false;
    plan() {
        // Only re-check infrastructure every `n` ticks after setup is complete (saves CPU)
        // if (this.setupComplete && Game.time % 50 !== 0) return;
        if (this.office.center.room.controller?.level && this.office.center.room.controller.level > 1) {
            // When available, lay out containers on mining locations
            for (let source of this.salesAnalyst.getUsableSourceLocations(this.office)) {
                if (Game.rooms[source.pos.roomName] && !source.containerId && !source.constructionSiteId) {
                    source.pos.createConstructionSite(STRUCTURE_CONTAINER);
                }
            }
            this.setupComplete = true;
        }
    }

    run() {
        if (global.v.franchises.state) {
            for (let source of this.salesAnalyst.getUsableSourceLocations(this.office)) {
                new RoomVisual(source.pos.roomName).rect(source.pos.x-2, source.pos.y-2, 4, 4, {stroke: '#0f0', fill: 'transparent'})
                if (source.franchisePos) {
                    new RoomVisual(source.franchisePos.roomName).circle(source.franchisePos, {radius: 1, stroke: '#0f0', fill: 'transparent'})
                }
            }
        }
    }
}
profiler.registerClass(SourceArchitect, 'SourceArchitect');
