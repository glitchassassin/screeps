import { Architect } from './Architect';
import { Franchise } from 'analysts/SalesAnalyst';
import { Office } from 'Office/Office';

export class SourceArchitect extends Architect {
    mines: Franchise[] = [];
    setupComplete = false;
    plan(office: Office) {
        // Only re-check infrastructure every `n` ticks after setup is complete (saves CPU)
        if (this.setupComplete && Game.time % 50 !== 0) return;

        this.mines = global.analysts.sales.getFranchiseLocations(office);
        if (this.mines.length == 0)  {
            // Lay out mining locations
            global.analysts.sales.calculateBestMiningLocations(office).forEach((mine, i) => {
                let flag = mine.pos.createFlag(`source${i}`, COLOR_GREEN);
                Memory.flags[flag] = {
                    source: mine.sourceId
                };
            })
        }

        if (office.center.room.controller?.level && office.center.room.controller.level > 1) {
            // When available, lay out containers on mining locations
            this.mines.forEach(mine => {
                if (!mine.container && !mine.constructionSite) {
                    mine.pos.createConstructionSite(STRUCTURE_CONTAINER);
                }
            })
            this.setupComplete = true;
        }
    }
}
