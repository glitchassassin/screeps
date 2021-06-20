import { DropRequest, ResupplyRequest } from "Logistics/LogisticsRequest";

import { Capacity } from "WorldState/Capacity";
import { FacilitiesAnalyst } from "Boardroom/BoardroomManagers/FacilitiesAnalyst";
import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { LogisticsManager } from "../LogisticsManager";
import { OfficeManager } from "Office/OfficeManager";

export class StorageStrategist extends OfficeManager {
    plan() {
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let facilitiesAnalyst = global.boardroom.managers.get('FacilitiesAnalyst') as FacilitiesAnalyst;
        let storage = logisticsAnalyst.getStorage(this.office)
        let storageCapacity = Capacity.byId(storage?.id)

        if (!storage || !storageCapacity) {
            const dumpPos = facilitiesAnalyst.getPlannedStructures(this.office).find(s => s.structureType === STRUCTURE_STORAGE)?.pos
            if (dumpPos) {
                logisticsManager.submit('surplus', new DropRequest(dumpPos, 2));
            }
            return;
        }

        // Primary orders
        // Fill the storage to 10% at same priority as supplying controller
        if ((storageCapacity.capacity ?? 0) > 0 && (storageCapacity.used ?? 1) / (storageCapacity.capacity ?? 1) < 0.1) {
            logisticsManager.submit(storage.id, new ResupplyRequest(storage, 2))
        } else {
            logisticsManager.submit(storage.id, new ResupplyRequest(storage, 1))
        }
    }
}
// profiler.registerClass(StorageStrategist, 'StorageStrategist');
