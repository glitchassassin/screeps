import { CachedStructure } from "WorldState/Structures";
import { Controllers } from "WorldState/Controllers";
import { HRAnalyst } from "Analysts/HRAnalyst";
import { LegalManager } from "../LegalManager";
import { LogisticsManager } from "../LogisticsManager";
import { MinionRequest } from "BehaviorTree/requests/MinionRequest";
import { OfficeManager } from "Office/OfficeManager";
import { RoomPlanData } from "WorldState/RoomPlans";
import { TransferRequest } from "BehaviorTree/requests/Transfer";
import { UpgradeRequest } from "BehaviorTree/requests/Upgrade";

export class LegalStrategist extends OfficeManager {
    public request?: MinionRequest;
    public fallbackRequest?: MinionRequest;
    buildRequest?: MinionRequest;

    plan() {
        let legalManager = this.office.managers.get('LegalManager') as LegalManager;
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        let controller = Controllers.byRoom(this.office.name);

        if (!controller) return;

        // Auxiliary orders
        // Logistics and infrastructure
        if (controller?.level && controller.level > 0) {
            let officePlans = RoomPlanData.byRoom(this.office.name)?.office
            if (HRAnalyst.getEmployees(this.office).some(
                c => c.memory?.type === 'PARALEGAL'
            )) {
                if (officePlans) {
                    logisticsManager.submit(new TransferRequest(
                        (officePlans.headquarters.storage.structure as CachedStructure<StructureStorage>|undefined) ?? officePlans.headquarters.storage.pos,
                        (officePlans.headquarters.container.structure as CachedStructure<StructureStorage>|undefined) ?? officePlans.headquarters.container.pos,
                    ))
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

        // if (controller.level < 5 && (!this.fallbackRequest || this.fallbackRequest.result)) {
        //     // If Engineers are otherwise idle, they can
        //     // upgrade the controller
        //     this.fallbackRequest = new UpgradeRequest(controller);
        //     this.fallbackRequest.priority = 1;
        //     facilitiesManager.submit(this.fallbackRequest);
        // }
    }
}
// profiler.registerClass(LegalStrategist, 'LegalStrategist');
