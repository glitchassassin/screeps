import { ControllerAnalyst } from '../../Boardroom/BoardroomManagers/ControllerAnalyst';
import { Office } from 'Office/Office';
import { OfficeManager } from 'Office/OfficeManager';
import profiler from 'screeps-profiler';

export class ControllerArchitect extends OfficeManager {
    constructor(
        office: Office,
        private controllerAnalyst = global.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst
    ) {
        super(office);
    }

    visualization: string = '';
    setupComplete = false;
    plan() {
        // Only re-check infrastructure every `n` ticks after setup is complete (saves CPU)
        if (this.setupComplete && Game.time % 50 !== 0) return;

        let controller = this.controllerAnalyst.getDesignatedUpgradingLocations(this.office);

        if (controller?.level && controller.level > 1) {
            if (controller.containerPos && !controller.container && !controller.constructionSite) {
                controller.containerPos?.createConstructionSite(STRUCTURE_CONTAINER);
                this.setupComplete = true;
            }
        }
    }

    run() {
        // Architect only renders if enabled and structures are not built
        if (global.v.controller.state) {
            let controller = this.controllerAnalyst.getDesignatedUpgradingLocations(this.office);
            if (controller?.containerPos) {
                let vis = new RoomVisual(controller.containerPos.roomName)
                vis.circle(controller.containerPos, {radius: 1, stroke: '#0f0', fill: 'transparent'})
                    .line(controller.containerPos, controller.pos, {color: '#0f0'})
            }
        }
    }
}
profiler.registerClass(ControllerArchitect, 'ControllerArchitect');
