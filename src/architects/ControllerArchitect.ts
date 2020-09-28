import { Architect } from './Architect';
import { ControllerAnalyst, Depot } from '../analysts/ControllerAnalyst';
import { Office } from 'Office/Office';

export class ControllerArchitect extends Architect {
    depot: Depot|null = null;
    setupComplete = false;
    plan(office: Office) {
        // Only re-check infrastructure every `n` ticks after setup is complete (saves CPU)
        if (this.setupComplete && Game.time % 50 !== 0) return;

        global.analysts.controller.calculateBestContainerLocation(office);
        if (!this.depot)  {
            // Scout an upgrade depot
            let pos = global.analysts.controller.calculateBestContainerLocation(office)
            if (!pos) return; // no viable container location
            let flag = pos?.createFlag(`upgradeDepot`, COLOR_BLUE);
            Memory.flags[flag] = {
                upgradeDepot: true
            };
        }

        this.depot = global.analysts.controller.getDesignatedUpgradingLocations(office);

        if (office.center.room.controller?.level && office.center.room.controller.level > 1) {
            if (!this.depot?.container && !this.depot?.constructionSite) {
                this.depot?.pos.createConstructionSite(STRUCTURE_CONTAINER);
                this.setupComplete = true;
            }
        }
    }
}
