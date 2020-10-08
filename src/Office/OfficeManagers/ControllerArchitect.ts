import { OfficeManager } from 'Office/OfficeManager';
import { ControllerAnalyst, Depot } from '../../Boardroom/BoardroomManagers/ControllerAnalyst';

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
        // Architect only renders if enabled and structures are not built
        if (global.v.controller.state) {
            if (this.office.center.controller?.pos && this.depot?.pos) {
                let vis = new RoomVisual(this.depot.pos.roomName)
                vis.circle(this.depot.pos, {radius: 1, stroke: '#0f0', fill: 'transparent'})
                    .line(this.depot.pos, this.office.center.controller.pos, {color: '#0f0'})
            }
        }
    }
}
