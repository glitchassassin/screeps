import { BuildRequest } from "BehaviorTree/requests/Build";
import { CachedSource } from "WorldState";
import { DropHarvestRequest } from "BehaviorTree/requests/DropHarvest";
import { FacilitiesManager } from "../FacilitiesManager";
import { LinkHarvestRequest } from "BehaviorTree/requests/LinkHarvest";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { SalesAnalyst } from "Boardroom/BoardroomManagers/SalesAnalyst";
import { SalesManager } from "../SalesManager";
import profiler from "screeps-profiler";
import { rclIsGreaterThan } from "utils/gameObjectSelectors";

export class SalesStrategist extends OfficeManager {
    public harvestRequests = new Map<CachedSource, MinionRequest>();
    public buildRequests = new Map<CachedSource, MinionRequest>();

    plan() {
        let salesAnalyst = global.boardroom.managers.get('SalesAnalyst') as SalesAnalyst;
        for (let source of salesAnalyst.getUntappedSources(this.office)) {
            if (rclIsGreaterThan(this.office.name, 1) && !source.container) {
                this.submitContainerRequest(source)
            }
            if (rclIsGreaterThan(this.office.name, 4) && !source.link) {
                this.submitLinkRequest(source)
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

    submitLinkRequest(source: CachedSource) {
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;

        // Check if we already have a build request
        let req = this.buildRequests.get(source);
        if (req && !req.result)                         return; // Request is pending
        if (req?.result)                                this.buildRequests.delete(source); // Request completed or failed
        if (!source.linkPos || source.link)   return; // Link already exists, or no position is allocated

        // Otherwise, create a new build request
        req = new BuildRequest(source.linkPos, STRUCTURE_LINK);
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
        if (!source.link) {
            req = new DropHarvestRequest(source)
        } else {
            req = new LinkHarvestRequest(source)
        }

        salesManager.submit(req);
        this.harvestRequests.set(source, req);
    }
}
profiler.registerClass(SalesStrategist, 'SalesStrategist');
