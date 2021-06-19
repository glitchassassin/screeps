import { DepotRequest, TransferRequest } from "Logistics/LogisticsRequest";

import { Controllers } from "WorldState/Controllers";
import { FacilitiesManager } from "../FacilitiesManager";
import { HRAnalyst } from "Boardroom/BoardroomManagers/HRAnalyst";
import { LegalData } from "WorldState/LegalData";
import { LegalManager } from "../LegalManager";
import { LogisticsManager } from "../LogisticsManager";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { Structures } from "WorldState/Structures";
import { UpgradeRequest } from "BehaviorTree/requests/Upgrade";

export class LegalStrategist extends OfficeManager {
    public request?: MinionRequest;
    public fallbackRequest?: MinionRequest;
    buildRequest?: MinionRequest;

    plan() {
        let legalManager = this.office.managers.get('LegalManager') as LegalManager;
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        let facilitiesManager = this.office.managers.get('FacilitiesManager') as FacilitiesManager;
        let hrAnalyst = global.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let controller = Controllers.byRoom(this.office.name);
        let legalData = LegalData.byRoom(this.office.name);

        if (!controller) return;

        // Auxiliary orders
        // Logistics and infrastructure
        if (controller?.level && controller.level > 0) {
            let container = Structures.byId(legalData?.containerId)
            if (hrAnalyst.getEmployees(this.office).some(
                c => c.memory?.type === 'PARALEGAL'
            )) {
                if (container) {
                    logisticsManager.submit(controller.pos.roomName, new TransferRequest(container, 2))
                } else if (legalData?.containerPos) {
                    logisticsManager.submit(controller.pos.roomName, new DepotRequest(legalData.containerPos, 2, CONTAINER_CAPACITY))
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

        if (controller.level < 5 && (!this.fallbackRequest || this.fallbackRequest.result)) {
            // If Engineers are otherwise idle, they can
            // upgrade the controller
            this.fallbackRequest = new UpgradeRequest(controller);
            this.fallbackRequest.priority = 1;
            facilitiesManager.submit(this.fallbackRequest);
        }
    }
}
// profiler.registerClass(LegalStrategist, 'LegalStrategist');
