import { ControllerAnalyst, Depot } from '../../Boardroom/BoardroomManagers/ControllerAnalyst';
import { Office } from 'Office/Office';
import { OfficeManager } from 'Office/OfficeManager';

export class ControllerArchitect extends OfficeManager {
    depot: Depot|null = null;
    visualization: string = '';
    setupComplete = false;
    plan() {
        // Only re-check infrastructure every `n` ticks after setup is complete (saves CPU)
        if (this.setupComplete && Game.time % 50 !== 0) return;
        let controller = global.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;

        if (!this.depot)  {
            // Scout an upgrade depot
            let pos = controller.calculateBestContainerLocation(this.office)
            if (!pos) return; // no viable container location
            let flag = pos?.createFlag(`upgradeDepot`, COLOR_BLUE);
            Memory.flags[flag] = {
                upgradeDepot: true
            };
        }

        this.depot = controller.getDesignatedUpgradingLocations(this.office);

        if (this.office.center.room.controller?.level && this.office.center.room.controller.level > 1) {
            if (!this.depot?.container && !this.depot?.constructionSite) {
                this.depot?.pos.createConstructionSite(STRUCTURE_CONTAINER);
                this.setupComplete = true;
            }
        }
    }

    run() {
        if (global.v.controller.state) {
            if (this.office.center.controller?.pos) {
                new RoomVisual(this.office.center.controller.pos.roomName).circle(this.office.center.controller.pos, {radius: 5, stroke: '#88f', fill: 'transparent'})
            }
        }
    }
}
