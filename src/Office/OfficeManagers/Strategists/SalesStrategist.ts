import { CachedSource } from "WorldState/Sources";
import { DropHarvestRequest } from "BehaviorTree/requests/DropHarvest";
import { FranchiseData } from "WorldState/FranchiseData";
import { LinkHarvestRequest } from "BehaviorTree/requests/LinkHarvest";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { SalesManager } from "../SalesManager";
import profiler from "screeps-profiler";

export class SalesStrategist extends OfficeManager {
    public harvestRequests = new Map<Id<Source>, MinionRequest>();

    plan() {
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        for (let source of salesAnalyst.getUntappedSources(this.office)) {
            this.submitHarvestRequest(source);
        }
    }

    submitHarvestRequest(source: CachedSource) {
        let salesManager = this.office.managers.get('SalesManager') as SalesManager;
        // Check if we already have a harvest request
        let req = this.harvestRequests.get(source.id);
        if (req && !req.result)     return; // Request is pending
        if (req?.result)            this.harvestRequests.delete(source.id); // Request completed or failed
        if (source instanceof Source && source.energy === 0)    return; // Wait for source to replenish

        // Otherwise, create a new harvest request
        if (!FranchiseData.byId(source.id)?.linkId) {
            req = new DropHarvestRequest(source)
        } else {
            req = new LinkHarvestRequest(source)
        }

        salesManager.submit(req);
        this.harvestRequests.set(source.id, req);
    }
}
profiler.registerClass(SalesStrategist, 'SalesStrategist');
