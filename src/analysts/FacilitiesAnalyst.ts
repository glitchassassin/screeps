import { Office } from "Office/Office";
import { Memoize } from "typescript-memoize";
import { Analyst } from "./Analyst";
import { MapAnalyst } from "./MapAnalyst";

export class FacilitiesAnalyst extends Analyst {
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getHandymen(office: Office) {
        return office.employees.filter(e => e.memory.type === 'HANDYMAN')
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getConstructionSites(office: Office) {
        let territories = [office.center, ...office.territories]
        return [
            ...territories.map(territory => territory.room.find(FIND_MY_CONSTRUCTION_SITES))
                          .reduce((a, b) => a.concat(b), [])
        ]
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getStructures(office: Office) {
        let territories = [office.center, ...office.territories]
        return [
            ...territories.map(territory => territory.room.find(FIND_STRUCTURES))
                          .reduce((a, b) => a.concat(b), [])
        ]
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
