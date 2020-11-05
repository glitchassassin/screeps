import { CachedCreep } from "WorldState";
import { LegalManager } from "./LegalManager/LegalManager";
import { OfficeManager } from "Office/OfficeManager";
import { Request } from "BehaviorTree/Request";
import { UpgradeRequest } from "BehaviorTree/requests/Upgrade";

export class LegalStrategist extends OfficeManager {
    public request?: Request<CachedCreep>;

    plan() {
        let legalManager = this.office.managers.get('LegalManager') as LegalManager;
        let controller = global.worldState.controllers.byRoom.get(this.office.name);

        if (this.request && !this.request.result)   return; // Request is pending
        if (this.request?.result)                   this.request = undefined // Request completed or failed
        if (!controller)                            return; // No controller (?)

        // Upgrade with as many minions as are available
        // (SpawnStrategist will determine when to spawn
        // additional upgraders)
        this.request = new UpgradeRequest(controller);
        legalManager.submit(this.request);
    }
}
