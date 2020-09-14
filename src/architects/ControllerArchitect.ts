import { Architect } from './Architect';
import { ControllerAnalyst, Depot } from '../analysts/ControllerAnalyst';

const controllerAnalyst = new ControllerAnalyst();

export class ControllerArchitect extends Architect {
    depot: Depot|null = null;
    setupComplete = false;
    init = (room: Room) => {
        // Only bother with rooms that have a controller
        if (!room.controller) return;
        // Only re-check infrastructure every `n` ticks after setup is complete (saves CPU)
        if (this.setupComplete && Game.time % 500 !== 0) return;

        controllerAnalyst.calculateBestContainerLocation(room);
        if (!this.depot)  {
            // Scout an upgrade depot
            let pos = controllerAnalyst.calculateBestContainerLocation(room)
            if (!pos) return; // no viable container location
            let flag = pos?.createFlag(`upgradeDepot`, COLOR_BLUE);
            Memory.flags[flag] = {
                upgradeDepot: true
            };
        }

        this.depot = controllerAnalyst.getDesignatedUpgradingLocations(room);

        if (room.controller?.level && room.controller?.level > 1) {
            // If needed, lay out containers on mining locations
            if (!this.depot?.container && !this.depot?.constructionSite) {
                this.depot?.pos.createConstructionSite(STRUCTURE_CONTAINER);
                this.setupComplete = true;
            }
        }
    }
}
