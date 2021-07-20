import { Controllers } from "WorldState/Controllers";
import { LegalManager } from "../LegalManager";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { PROFILE } from "config";
import { RoomPlanData } from "WorldState/RoomPlans";
import { UpgradeRequest } from "BehaviorTree/requests/Upgrade";
import profiler from "screeps-profiler";

export class LegalStrategist extends OfficeManager {
    public request?: MinionRequest;
    public fallbackRequest?: MinionRequest;
    buildRequest?: MinionRequest;

    plan() {
        let legalManager = this.office.managers.get('LegalManager') as LegalManager;
        let controller = Controllers.byRoom(this.office.name);
        let office = RoomPlanData.byRoom(this.office.name)?.office

        if (!controller || !office) return;

        // Upgrade orders

        if (!this.request || this.request.result) {
            // Upgrade with as many minions as are available
            // (SpawnStrategist will determine when to spawn
            // additional upgraders)
            this.request = new UpgradeRequest(controller, office.headquarters.container);
            legalManager.submit(this.request);
        }

        // if (controller.level < 5 && (!this.fallbackRequest || this.fallbackRequest.result)) {
        //     // If Engineers are otherwise idle, they can
        //     // upgrade the controller
        //     this.fallbackRequest = new UpgradeRequest(controller);
        //     this.fallbackRequest.priority = 1;
        //     facilitiesManager.submit(this.fallbackRequest);
        // }
    }
}

if (PROFILE.managers) profiler.registerClass(LegalStrategist, 'LegalStrategist');
