import { BoardroomManager } from "Boardroom/BoardroomManager";
import { HRAnalyst } from "./HRAnalyst";
import { Memoize } from "typescript-memoize";
import { Office } from "Office/Office";
import { lazyFilter } from "utils/lazyIterators";

export class FacilitiesAnalyst extends BoardroomManager {
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getEngineers(office: Office) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst
        return hrAnalyst.getEmployees(office, 'ENGINEER');
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getConstructionSites(office: Office) {
        let territories = [office.center, ...office.territories].map(t => t.name)
        return territories.flatMap(t => Array.from(global.worldState.constructionSites.byRoom.get(t) ?? []))
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getStructures(office: Office) {
        let territories = [office.center, ...office.territories].map(t => t.name)
        return territories.flatMap(t => Array.from(global.worldState.structures.byRoom.get(t) ?? []))
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
