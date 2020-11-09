import { ControllerAnalyst } from "Boardroom/BoardroomManagers/ControllerAnalyst";
import { OfficeManager } from "Office/OfficeManager";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import profiler from "screeps-profiler";

export class LinkManager extends OfficeManager {
    run() {
        super.run();
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        let controllerAnalyst = global.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;

        let sources = salesAnalyst.getUsableSourceLocations(this.office);
        let controller = controllerAnalyst.getDesignatedUpgradingLocations(this.office);

        if (!controller?.link?.gameObj || controller.link.capacityFree === 0) return;

        for (let source of sources) {
            if (source.link?.gameObj?.cooldown === 0) {
                source.link.gameObj.transferEnergy(controller.link.gameObj);
            }
        }
    }
}
profiler.registerClass(LinkManager, 'LinkManager');
