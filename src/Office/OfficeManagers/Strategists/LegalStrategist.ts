import { DepotRequest, TransferRequest } from "Logistics/LogisticsRequest";

import { BuildRequest } from "BehaviorTree/requests/Build";
import { FacilitiesManager } from "../FacilitiesManager";
import { LegalManager } from "../LegalManager";
import { LogisticsManager } from "../LogisticsManager";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { UpgradeRequest } from "BehaviorTree/requests/Upgrade";
import profiler from "screeps-profiler";

export class LegalStrategist extends OfficeManager {
    public request?: MinionRequest;
    public fallbackRequest?: MinionRequest;
    buildRequest?: MinionRequest;

    plan() {
        let legalManager = this.office.managers.get('LegalManager') as LegalManager;
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;
        let controller = global.worldState.controllers.byRoom.get(this.office.name);

        if (!controller) return;

        // Auxiliary orders
        // Logistics and infrastructure
        if (controller?.level && controller.level > 1) {
            if (controller.container) {
                logisticsManager.submit(controller.pos.roomName, new TransferRequest(controller.container, 2))
            } else if (controller.containerPos) {
                logisticsManager.submit(controller.pos.roomName, new DepotRequest(controller.containerPos, 2))

                if (!this.buildRequest) {
                    this.buildRequest = new BuildRequest(controller.containerPos, STRUCTURE_CONTAINER);
                    facilitiesManager.submit(this.buildRequest);
                }
            }
        }

        // Upgrade orders

        if (!this.request || this.request.result) {
            // Upgrade with as many minions as are available
            // (SpawnStrategist will determine when to spawn
            // additional upgraders)
            this.request = new UpgradeRequest(controller);
            legalManager.submit(this.request);
        }

        if (!this.fallbackRequest || this.fallbackRequest.result) {
            // If Engineers are otherwise idle, they can
            // upgrade the controller
            this.fallbackRequest = new UpgradeRequest(controller);
            this.fallbackRequest.priority = 1;
            facilitiesManager.submit(this.fallbackRequest);
        }
    }
}
profiler.registerClass(LegalStrategist, 'LegalStrategist');
