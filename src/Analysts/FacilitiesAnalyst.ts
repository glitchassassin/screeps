import { ConstructionSites } from "WorldState/ConstructionSites";
import { HRAnalyst } from "Analysts/HRAnalyst";
import { MemoizeByTick } from "utils/memoize";
import type { Office } from "Office/Office";
import { RoomPlanningAnalyst } from "./RoomPlanningAnalyst";
import { Structures } from "WorldState/Structures";

export class FacilitiesAnalyst {
    @MemoizeByTick((office: Office) => office.name)
    static getEngineers(office: Office) {
        return HRAnalyst.getEmployees(office, 'ENGINEER');
    }
    @MemoizeByTick((office: Office) => office.name)
    static getWorkExpectancy(office: Office) {
        let workExpectancy = 0;
        for (let creep of this.getEngineers(office)) {
            workExpectancy += (creep.getActiveBodyparts(WORK) * (creep.ticksToLive ?? 1500) * 2.5)
        }
        return workExpectancy
    }
    @MemoizeByTick((office: Office) => office.name)
    static getExpectedOutput(office: Office) {
        let expectedOutput = 0;
        for (let creep of this.getEngineers(office)) {
            expectedOutput += (creep.getActiveBodyparts(WORK) * 2.5)
        }
        return expectedOutput
    }
    @MemoizeByTick((office: Office) => office.name)
    static getConstructionSites(office: Office) {
        return ConstructionSites.byOffice(office);
    }
    @MemoizeByTick((office: Office) => office.name)
    static getStructures(office: Office) {
        return Structures.byOffice(office);
    }
    @MemoizeByTick((office: Office) => office.name)
    static getPlannedStructures(office: Office) {
        return RoomPlanningAnalyst.getRoomPlan(office.name)?.structures ?? []
    }

    @MemoizeByTick((office: Office) => office.name)
    static needsStructures(office: Office) {
        // has construction sites which are not roads
        return this.getConstructionSites(office).some(site => site.structureType !== STRUCTURE_ROAD);
    }

    @MemoizeByTick((office: Office) => office.name)
    static needsRoads(office: Office) {
        // has construction sites which are roads
        return this.getConstructionSites(office).some(site => site.structureType === STRUCTURE_ROAD);
    }
}
