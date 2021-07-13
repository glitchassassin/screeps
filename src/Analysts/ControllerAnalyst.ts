import { CachedController, Controllers } from "WorldState/Controllers";
import { DefenseAnalyst, TerritoryIntent } from "./DefenseAnalyst";

import { LegalData } from "WorldState/LegalData";
import { LegalManager } from "Office/OfficeManagers/LegalManager";
import { MapAnalyst } from "./MapAnalyst";
import { MemoizeByTick } from "utils/memoize";
import type { Office } from "Office/Office";

export class ControllerAnalyst {
    @MemoizeByTick((office: Office) => office.name)
    static getDesignatedUpgradingLocations(office: Office) {
        let controller = LegalData.byRoom(office.name);
        if (!controller?.containerPos) return null;

        return controller;
    }
    @MemoizeByTick((office: Office) => office.name)
    static getReservingControllers(office: Office) {
        let territories = MapAnalyst.calculateNearbyRooms(office.name, 1);
        let controllers: CachedController[] = [];
        for (let t of territories) {
            let intent = DefenseAnalyst.getTerritoryIntent(t)
            if (intent === TerritoryIntent.EXPLOIT) {
                let controller = Controllers.byRoom(t);
                if (controller) {
                    controllers.push(controller);
                }
            }
        }
        return controllers;
    }
    @MemoizeByTick((office: Office) => office.name)
    static unassignedUpgradeRequests(office: Office) {
        return (office.managers.get('LegalManager') as LegalManager).requests.filter(r => {
            return r.assigned.length === 0
        });
    }
}
