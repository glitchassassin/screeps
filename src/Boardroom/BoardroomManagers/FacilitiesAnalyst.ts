import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Memoize } from "typescript-memoize";
import { Office } from "Office/Office";
import { lazyFilter } from "utils/lazyIterators";

export class FacilitiesAnalyst extends BoardroomManager {
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getEngineers(office: Office) {
        return Array.from(lazyFilter(
            this.worldState.creeps.byOffice.get(office.center.name) ?? [],
            c => c.memory.type === 'ENGINEER'
        ))
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getConstructionSites(office: Office) {
        let territories = [office.center, ...office.territories].map(t => t.name)
        return territories.flatMap(t => Array.from(this.worldState.constructionSites.byRoom.get(t) ?? []))
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getStructures(office: Office) {
        let territories = [office.center, ...office.territories].map(t => t.name)
        return territories.flatMap(t => Array.from(this.worldState.structures.byRoom.get(t) ?? []))
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
