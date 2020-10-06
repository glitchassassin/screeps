import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Office } from "Office/Office";
import { Memoize } from "typescript-memoize";

interface GenericSite {
    pos: RoomPosition,
    id: Id<Structure|ConstructionSite>,
    structureType: StructureConstant,
}

export interface CachedStructure extends GenericSite {
    id: Id<Structure>,
    gameObj?: Structure,
}
const unwrapStructure = ({pos, id, structureType}: CachedStructure): CachedStructure => ({pos, id, structureType});

export interface CachedConstructionSite extends GenericSite {
    id: Id<ConstructionSite>,
    progress: number,
    progressTotal: number
    gameObj?: ConstructionSite,
}
const unwrapConstructionSite = ({pos, id, structureType, progress, progressTotal}: CachedConstructionSite): CachedConstructionSite => ({pos, id, structureType, progress, progressTotal});

const siteProxy = <T extends GenericSite>(constructionSite: T): T => {
    return new Proxy(constructionSite, {
        get: (target, prop: keyof T) => {
            if (!target) {
                return undefined;
            } else if (prop === 'pos' && target.pos) {
                return new RoomPosition(target.pos.x, target.pos.y, target.pos.roomName);
            } else if (prop === 'gameObj') {
                return Game.getObjectById(target.id) || undefined;
            } else {
                return target[prop];
            }
        }
    })
}

const sitesProxy = <T extends GenericSite>(constructionSites: {[id: string]: T}): {[id: string]: T} => {
    return new Proxy(constructionSites, {
        get: (target, prop: string) => {
            if (target[prop]) {
                if (Game.rooms[target[prop].pos.roomName] && !Game.getObjectById(target[prop].id)) {
                    // Room is visible but target does not exist
                    delete target[prop];
                    return undefined;
                }
                return siteProxy(target[prop]);
            }
            return undefined;
        }
    })
}

type FacilitiesAnalystMemory = {
    constructionSites: {[id: string]: CachedConstructionSite};
    structures: {[id: string]: CachedStructure};
}

export class FacilitiesAnalyst extends BoardroomManager {
    init() {
        Memory.boardroom.FacilitiesAnalyst ||= {
            constructionSites: {},
            structures: {}
        } as FacilitiesAnalystMemory;
        Memory.boardroom.FacilitiesAnalyst.constructionSites ||= {};
        Memory.boardroom.FacilitiesAnalyst.structures ||= {};
    }
    memory = {
        constructionSites: sitesProxy<CachedConstructionSite>(Memory.boardroom.FacilitiesAnalyst.constructionSites),
        structures: sitesProxy<CachedStructure>(Memory.boardroom.FacilitiesAnalyst.structures)
    }

    plan() {
        let ownedSites = Object.values(Game.constructionSites);
        let visibleSites = Object.values(Game.rooms).map(room => room.find(FIND_CONSTRUCTION_SITES) || []).reduce((a, b) => a.concat(b), []);
        let visibleStructures = Object.values(Game.rooms).map(room => room.find(FIND_STRUCTURES) || []).reduce((a, b) => a.concat(b), []);

        // Refresh construction sites
        [...ownedSites, ...visibleSites].forEach(site => {
            this.memory.constructionSites[site.id] = unwrapConstructionSite(site);
        })

        // Refresh structures
        visibleStructures.forEach(structure => {
            this.memory.structures[structure.id] = unwrapStructure(structure);
        })
    }

    @Memoize((office: Office) => ('' + office.name + Game.time))
    getHandymen(office: Office) {
        return office.employees.filter(e => e.memory.type === 'HANDYMAN')
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getConstructionSites(office: Office) {
        let territories = [office.center, ...office.territories].map(t => t.name)
        return Object.values(this.memory.constructionSites).filter(site => territories.includes(site.pos.roomName));
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getStructures(office: Office) {
        let territories = [office.center, ...office.territories].map(t => t.name)
        return Object.values(this.memory.structures).filter(site => territories.includes(site.pos.roomName));
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
