import { DropHarvestRequest } from "BehaviorTree/requests/DropHarvest";
import { DropMineRequest } from "BehaviorTree/requests/DropMine";
import { LinkHarvestRequest } from "BehaviorTree/requests/LinkHarvest";
import { MineData } from "WorldState/MineData";
import { MineManager } from "../MineManager";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { SalesAnalyst } from "Analysts/SalesAnalyst";
import { SalesManager } from "../SalesManager";
import profiler from "screeps-profiler";

export class HarvestStrategist extends OfficeManager {
    public harvestRequests = new Map<Id<Source|Mineral>, MinionRequest>();

    plan() {
        for (let franchise of SalesAnalyst.getExploitableFranchises(this.office)) {
            if (!franchise.linkId) {
                this.submitHarvestRequest(new DropHarvestRequest(franchise));
            } else {
                this.submitHarvestRequest(new LinkHarvestRequest(franchise));
            }

        }
        for (let mine of MineData.byOffice(this.office)) {
            this.submitHarvestRequest(new DropMineRequest(mine))
        }
    }

    submitHarvestRequest(req: DropHarvestRequest|LinkHarvestRequest|DropMineRequest) {
        let salesManager = this.office.managers.get('SalesManager') as SalesManager;
        let mineManager = this.office.managers.get('MineManager') as MineManager;
        // Check if we already have a harvest request
        let existingReq = this.harvestRequests.get(req.targetId);
        if (existingReq && !existingReq.result)     return; // Request is pending
        if (existingReq?.result)                    this.harvestRequests.delete(req.targetId); // Request completed or failed

        if (req instanceof DropMineRequest) {
            mineManager.submit(req);
        } else {
            salesManager.submit(req);
        }
        this.harvestRequests.set(req.targetId, req);
    }
}
profiler.registerClass(HarvestStrategist, 'HarvestStrategist');
