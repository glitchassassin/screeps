import { Capacity } from "WorldState/Capacity";
import { ControllerAnalyst } from "Analysts/ControllerAnalyst";
import { OfficeManager } from "Office/OfficeManager";
import { SalesAnalyst } from "Analysts/SalesAnalyst";
import { byId } from "utils/gameObjectSelectors";

export class LinkManager extends OfficeManager {
    run() {
        super.run();

        let franchises = SalesAnalyst.getExploitableFranchises(this.office);
        let controller = ControllerAnalyst.getDesignatedUpgradingLocations(this.office);
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
