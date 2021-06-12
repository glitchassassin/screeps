import { BoardroomManager } from "Boardroom/BoardroomManager";
import { ConstructionSites } from "WorldState/ConstructionSites";
import { HRAnalyst } from "./HRAnalyst";
import { MemoizeByTick } from "utils/memoize";
import { Office } from "Office/Office";
import { RoomArchitect } from "./Architects/RoomArchitect";
import { Structures } from "WorldState/Structures";

export class FacilitiesAnalyst extends BoardroomManager {
    @MemoizeByTick((office: Office) => office.name)
    getEngineers(office: Office) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst
        return hrAnalyst.getEmployees(office, 'ENGINEER');
    }
    @MemoizeByTick((office: Office) => office.name)
    getWorkExpectancy(office: Office) {
        let workExpectancy = 0;
        for (let creep of this.getEngineers(office)) {
            workExpectancy += (creep.getActiveBodyparts(WORK) * (creep.ticksToLive ?? 1500) * 2.5)
        }
        return workExpectancy
    }
    @MemoizeByTick((office: Office) => office.name)
    getExpectedOutput(office: Office) {
        let expectedOutput = 0;
        for (let creep of this.getEngineers(office)) {
            expectedOutput += (creep.getActiveBodyparts(WORK) * 2.5)
        }
        return expectedOutput
    }
    @MemoizeByTick((office: Office) => office.name)
    getConstructionSites(office: Office) {
        return ConstructionSites.byOffice(office);
    }
    @MemoizeByTick((office: Office) => office.name)
    getStructures(office: Office) {
        return Structures.byOffice(office);
    }
    @MemoizeByTick((office: Office) => office.name)
    getPlannedStructures(office: Office) {
        let roomArchitect = this.boardroom.managers.get('RoomArchitect') as RoomArchitect;
        return roomArchitect.roomPlans.get(office.name)?.structures ?? []
    }

    @MemoizeByTick((office: Office) => office.name)
    needsStructures(office: Office) {
        // has construction sites which are not roads
        return this.getConstructionSites(office).some(site => site.structureType !== STRUCTURE_ROAD);
    }

    @MemoizeByTick((office: Office) => office.name)
    needsRoads(office: Office) {
        // has construction sites which are roads
        return this.getConstructionSites(office).some(site => site.structureType === STRUCTURE_ROAD);
    }
}
