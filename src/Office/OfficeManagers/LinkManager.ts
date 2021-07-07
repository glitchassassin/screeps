import { Capacity } from "WorldState/Capacity";
import { ControllerAnalyst } from "Boardroom/BoardroomManagers/ControllerAnalyst";
import { OfficeManager } from "Office/OfficeManager";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { byId } from "utils/gameObjectSelectors";

export class LinkManager extends OfficeManager {
    run() {
        super.run();
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        let controllerAnalyst = global.boardroom.managers.get('ControllerAnalyst') as ControllerAnalyst;

        let franchises = salesAnalyst.getExploitableFranchises(this.office);
        let controller = controllerAnalyst.getDesignatedUpgradingLocations(this.office);
        let controllerLink = byId(controller?.linkId)

        if (!controllerLink || Capacity.byId(controllerLink.id)?.free === 0) return;

        for (let franchise of franchises) {
            let link = byId(franchise.linkId)
            if (link?.cooldown === 0) {
                link.transferEnergy(controllerLink);
            }
        }
    }
}
// profiler.registerClass(LinkManager, 'LinkManager');
