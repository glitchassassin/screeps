import { CachedCreep, CachedSource } from "WorldState";

import { BuildRequest } from "BehaviorTree/requests/Build";
import { DropHarvestRequest } from "BehaviorTree/requests/DropHarvest";
import { FacilitiesManager } from "./FacilitiesManager";
import { OfficeManager } from "Office/OfficeManager";
import { Request } from "BehaviorTree/Request";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { SalesManager } from "./SalesManager";
import { rclIsGreaterThan } from "utils/gameObjectSelectors";

export class SalesStrategist extends OfficeManager {
    public harvestRequests = new Map<CachedSource, Request<CachedCreep>>();
    public buildRequests = new Map<CachedSource, Request<CachedCreep>>();

    plan() {
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        for (let source of salesAnalyst.getUntappedSources(this.office)) {
            if (rclIsGreaterThan(this.office.name, 1)) {
                this.submitContainerRequest(source)
            }
            this.submitHarvestRequest(source);
        }
    }

    submitContainerRequest(source: CachedSource) {
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;

        // Check if we already have a build request
        let req = this.buildRequests.get(source);
        if (req && !req.result)                         return; // Request is pending
        if (req?.result)                                this.buildRequests.delete(source); // Request completed or failed
        if (!source.franchisePos || source.container)   return; // Container already exists, or no position is allocated

        // Otherwise, create a new build request
        req = new BuildRequest(source.franchisePos, STRUCTURE_CONTAINER);
        facilitiesManager.submit(req);
        this.buildRequests.set(source, req);
    }

    submitHarvestRequest(source: CachedSource) {
        let salesManager = this.office.managers.get('SalesManager') as SalesManager;
        // Check if we already have a harvest request
        let req = this.harvestRequests.get(source);
        if (req && !req.result)     return; // Request is pending
        if (req?.result)            this.harvestRequests.delete(source); // Request completed or failed
        if (source.energy === 0)    return; // Wait for source to replenish

        // Otherwise, create a new harvest request
        console.log(`${this.constructor.name}.submitHarvestRequest`);
        req = new DropHarvestRequest(source)
        salesManager.submit(req);
        this.harvestRequests.set(source, req);
    }
}
