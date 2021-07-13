import { DepotRequest, TransferRequest } from "Logistics/LogisticsRequest";

import { Capacity } from "WorldState/Capacity";
import { FacilitiesAnalyst } from "Analysts/FacilitiesAnalyst";
import { LogisticsAnalyst } from "Analysts/LogisticsAnalyst";
import { LogisticsManager } from "../LogisticsManager";
import { OfficeManager } from "Office/OfficeManager";
import { SourceType } from "Logistics/LogisticsSource";

export class StorageStrategist extends OfficeManager {
    plan() {
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        let storage = LogisticsAnalyst.getStorage(this.office)
        let storageCapacity = Capacity.byId(storage?.id)

        if (!storage || !storageCapacity) {
            const dumpPos = FacilitiesAnalyst.getPlannedStructures(this.office).find(s => s.structureType === STRUCTURE_STORAGE)?.pos
            if (dumpPos) {
                logisticsManager.submit('surplus', new DepotRequest(dumpPos, 2, STORAGE_CAPACITY, SourceType.PRIMARY));
            }
            return;
        }

        // Primary orders
        // Fill the storage to 10% at same priority as supplying controller
        if ((storageCapacity.capacity ?? 0) > 0 && (storageCapacity.used ?? 1) / (storageCapacity.capacity ?? 1) < 0.1) {
            logisticsManager.submit(storage.id, new TransferRequest(storage, 2, storageCapacity.free, SourceType.PRIMARY))
        } else {
            logisticsManager.submit(storage.id, new TransferRequest(storage, 1, STORAGE_CAPACITY, SourceType.PRIMARY))
        }
    }
}
// profiler.registerClass(StorageStrategist, 'StorageStrategist');
