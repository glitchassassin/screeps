import { Franchise, SalesAnalyst } from 'Boardroom/BoardroomManagers/SalesAnalyst';
import { Office } from 'Office/Office';
import { OfficeManager } from 'Office/OfficeManager';

export class SourceArchitect extends OfficeManager {
    mines: Franchise[] = [];
    setupComplete = false;
    plan() {
        // Only re-check infrastructure every `n` ticks after setup is complete (saves CPU)
        // if (this.setupComplete && Game.time % 50 !== 0) return;
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;

        this.mines = salesAnalyst.getFranchiseLocations(this.office);

        if (this.office.center.room.controller?.level && this.office.center.room.controller.level > 1) {
            // When available, lay out containers on mining locations
            this.mines.forEach(mine => {
                if (Game.rooms[mine.pos.roomName] && !mine.container && !mine.constructionSite) {
                    mine.pos.createConstructionSite(STRUCTURE_CONTAINER);
                }
            })
            this.setupComplete = true;
        }
    }
}
