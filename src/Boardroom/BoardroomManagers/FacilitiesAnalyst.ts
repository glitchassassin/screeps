import { BoardroomManager } from "Boardroom/BoardroomManager";
import { ConstructionSites } from "WorldState/ConstructionSites";
import { HRAnalyst } from "./HRAnalyst";
import { Memoize } from "typescript-memoize";
import { Office } from "Office/Office";
import { RoomArchitect } from "./Architects/RoomArchitect";
import { Structures } from "WorldState/Structures";

export class FacilitiesAnalyst extends BoardroomManager {
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getEngineers(office: Office) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst
        return hrAnalyst.getEmployees(office, 'ENGINEER');
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getWorkExpectancy(office: Office) {
        let workExpectancy = 0;
        for (let creep of this.getEngineers(office)) {
            workExpectancy += (creep.getActiveBodyparts(WORK) * (creep.ticksToLive ?? 1500) * 2.5)
        }
        return workExpectancy
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getExpectedOutput(office: Office) {
        let expectedOutput = 0;
        for (let creep of this.getEngineers(office)) {
            expectedOutput += (creep.getActiveBodyparts(WORK) * 2.5)
        }
        return expectedOutput
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getConstructionSites(office: Office) {
        return ConstructionSites.byOffice(office);
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getStructures(office: Office) {
        return Structures.byOffice(office);
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getPlannedStructures(office: Office) {
        let roomArchitect = this.boardroom.managers.get('RoomArchitect') as RoomArchitect;
        return roomArchitect.roomPlans.get(office.name)?.structures ?? []
    }

    @Memoize((office: Office) => ('' + office.name + Game.time))
    needsStructures(office: Office) {
        // has construction sites which are not roads
        return this.getConstructionSites(office).some(site => site.structureType !== STRUCTURE_ROAD);
    }

    @Memoize((office: Office) => ('' + office.name + Game.time))
    needsRoads(office: Office) {
        // has construction sites which are roads
        return this.getConstructionSites(office).some(site => site.structureType === STRUCTURE_ROAD);
    }
}
