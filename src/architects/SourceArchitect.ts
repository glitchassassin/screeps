import { Architect } from './Architect';
import { SourceAnalyst, Mine } from 'analysts/SourceAnalyst';

const sourceAnalyst = new SourceAnalyst();

export class SourceArchitect extends Architect {
    mines: Mine[] = [];
    setupComplete = false;
    init = (room: Room) => {
        // Only re-check infrastructure every `n` ticks after setup is complete (saves CPU)
        if (this.setupComplete && Game.time % 500 !== 0) return;

        this.mines = sourceAnalyst.getDesignatedMiningLocations(room);
        if (this.mines.length == 0)  {
            // Lay out mining locations
            sourceAnalyst.calculateBestMiningLocations(room).forEach((pos, i) => {
                let flag = pos.createFlag(`source${i}`, COLOR_GREEN);
                Memory.flags[flag] = {
                    source: `${i}`
                };
            })
        }

        if (room.controller?.level && room.controller?.level > 1) {
            // If needed, lay out containers on mining locations
            this.mines.forEach(mine => {
                if (!mine.container && !mine.constructionSite) {
                    mine.pos.createConstructionSite(STRUCTURE_CONTAINER);
                    this.setupComplete = true;
                }
            })
        }
    }
}
