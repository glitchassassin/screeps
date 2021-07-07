import { CachedFranchise } from "WorldState/FranchiseData";
import { DropHarvestRequest } from "BehaviorTree/requests/DropHarvest";
import { LinkHarvestRequest } from "BehaviorTree/requests/LinkHarvest";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { SalesManager } from "../SalesManager";

export class SalesStrategist extends OfficeManager {
    public harvestRequests = new Map<Id<Source>, MinionRequest>();

    plan() {
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;

        for (let franchise of salesAnalyst.getExploitableFranchises(this.office)) {
            this.submitHarvestRequest(franchise);
        }
    }

    submitHarvestRequest(franchise: CachedFranchise) {
        let salesManager = this.office.managers.get('SalesManager') as SalesManager;
        // Check if we already have a harvest request
        let req = this.harvestRequests.get(franchise.id);
        if (req && !req.result)     return; // Request is pending
        if (req?.result)            this.harvestRequests.delete(franchise.id); // Request completed or failed

        if (!franchise.linkId) {
            req = new DropHarvestRequest(franchise)
        } else {
            req = new LinkHarvestRequest(franchise)
        }

        salesManager.submit(req);
        this.harvestRequests.set(franchise.id, req);
    }
}
// profiler.registerClass(SalesStrategist, 'SalesStrategist');
