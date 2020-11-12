import { LogisticsAnalyst } from "Boardroom/BoardroomManagers/LogisticsAnalyst";
import { LogisticsManager } from "../LogisticsManager";
import { OfficeManager } from "Office/OfficeManager";
import { ResupplyRequest } from "Logistics/LogisticsRequest";
import profiler from "screeps-profiler";

export class StorageStrategist extends OfficeManager {
    plan() {
        let logisticsManager = this.office.managers.get('LogisticsManager') as LogisticsManager;
        let logisticsAnalyst = global.boardroom.managers.get('LogisticsAnalyst') as LogisticsAnalyst;
        let storage = logisticsAnalyst.getStorage(this.office)

        if (!storage) return;

        // Primary orders
        // Fill the storage to 10% at same priority as supplying controller
        if (storage.capacity > 0 && storage.capacityUsed / storage.capacity < 0.1) {
            logisticsManager.submit(storage.id, new ResupplyRequest(storage, 2))
        } else {
            logisticsManager.submit(storage.id, new ResupplyRequest(storage, 1))
        }
    }
}
profiler.registerClass(StorageStrategist, 'StorageStrategist');
