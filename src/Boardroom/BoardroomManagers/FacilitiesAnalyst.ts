import { BoardroomManager, BoardroomManagerMemory } from "Boardroom/BoardroomManager";
import { serialize, deserialize, Transform, Type } from "class-transformer";
import { Office } from "Office/Office";
import { Memoize } from "typescript-memoize";
import { transformRoomPosition } from "utils/transformGameObject";

export class CachedConstructionSite {
    @Transform(transformRoomPosition)
    public pos: RoomPosition;
    public id: Id<ConstructionSite>;
    public structureType: StructureConstant;
    public progress: number;
    public progressTotal: number;

    public get gameObj() : ConstructionSite|null {
        return Game.getObjectById(this.id);
    }

    constructor(site: ConstructionSite) {
        this.pos = site?.pos;
        this.id = site?.id;
        this.structureType = site?.structureType;
        this.progress = site?.progress;
        this.progressTotal = site?.progressTotal;
    }
}
export class CachedStructure {
    @Transform(transformRoomPosition)
    public pos: RoomPosition;
    public id: Id<Structure>;
    public structureType: StructureConstant;

    public get gameObj() : Structure|null {
        return Game.getObjectById(this.id);
    }

    constructor(site: Structure) {
        this.pos = site?.pos;
        this.id = site?.id;
        this.structureType = site?.structureType;
    }
}

class FacilitiesAnalystMemory extends BoardroomManagerMemory {
    @Type(() => CachedConstructionSite)
    public constructionSites: Map<string, CachedConstructionSite> = new Map();
    @Type(() => CachedStructure)
    public structures: Map<string, CachedStructure> = new Map();
}

export class FacilitiesAnalyst extends BoardroomManager {
    cache = new FacilitiesAnalystMemory();

    plan() {
        let ownedSites = Object.values(Game.constructionSites);
        let visibleSites = Object.values(Game.rooms).map(room => room.find(FIND_CONSTRUCTION_SITES) || []).reduce((a, b) => a.concat(b), []);
        let visibleStructures = Object.values(Game.rooms).map(room => room.find(FIND_STRUCTURES) || []).reduce((a, b) => a.concat(b), []);

        // Purge old construction sites
        this.cache.constructionSites.forEach((site, siteId) => {
            if (Game.rooms[site.pos.roomName] && !Game.getObjectById(siteId as Id<ConstructionSite>)) {
                // Room is visible, but construction site no longer exists
                this.cache.constructionSites.delete(siteId);
            }
        });
        // Refresh construction sites
        [...ownedSites, ...visibleSites].forEach(site => {
            this.cache.constructionSites.set(site.id, new CachedConstructionSite(site));
        })

        // Purge old structures
        this.cache.structures.forEach((structure, structureId) => {
            if (Game.rooms[structure.pos.roomName] && !Game.getObjectById(structureId as Id<Structure>)) {
                // Room is visible, but structure no longer exists
                this.cache.structures.delete(structureId)
            }
        });
        // Refresh structures
        visibleStructures.forEach(structure => {
            this.cache.structures.set(structure.id, new CachedStructure(structure));
        })
    }

    @Memoize((office: Office) => ('' + office.name + Game.time))
    getHandymen(office: Office) {
        return office.employees.filter(e => e.memory.type === 'HANDYMAN')
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getConstructionSites(office: Office) {
        let territories = [office.center, ...office.territories].map(t => t.name)
        return Array.from(this.cache.constructionSites.values()).filter(site => territories.includes(site.pos.roomName));
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getStructures(office: Office) {
        let territories = [office.center, ...office.territories].map(t => t.name)
        return Array.from(this.cache.structures.values()).filter(site => territories.includes(site.pos.roomName));
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
