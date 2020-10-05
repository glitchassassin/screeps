
import { Office } from "Office/Office";
import { SalesmanMinion } from "MinionRequests/minions/SalesmanMinion";
import { Memoize } from "typescript-memoize";
import { BoardroomManager, BoardroomManagerMemory } from "Boardroom/BoardroomManager";
import { HRAnalyst } from "./HRAnalyst";
import { MapAnalyst } from "./MapAnalyst";
import { Transform, Type } from "class-transformer";
import { transformRoomPosition } from "utils/transformGameObject";
import { countEnergyInContainersOrGround } from "utils/gameObjectSelectors";

export class Franchise {
    @Transform(transformRoomPosition)
    pos: RoomPosition;
    @Transform(transformRoomPosition)
    sourcePos: RoomPosition;
    id: string;
    officeId: string;
    maxSalesmen: number;
    private _surplus: number = 0;

    public get source() : Source|null {
        return Game.getObjectById(this.id as Id<Source>);
    }

    public get container() : StructureContainer|null {
        if (!Game.rooms[this.pos.roomName]) return null;
        return (this.pos.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_CONTAINER) as StructureContainer|undefined) || null
    }

    public get constructionSite() : ConstructionSite|null {
        if (!Game.rooms[this.pos.roomName]) return null;
        return (this.pos.lookFor(LOOK_CONSTRUCTION_SITES).find(s => s.structureType === STRUCTURE_CONTAINER) as ConstructionSite|undefined) || null
    }


    public get office() : Office|undefined {
        return global.boardroom.offices.get(this.officeId);
    }

    public get salesmen() : Creep[] {
        return this.office?.employees.filter(c => c.memory.source === this.id) || [];
    }

    public get surplus() : number {
        if (Game.rooms[this.pos.roomName]) this._surplus = countEnergyInContainersOrGround(this.sourcePos);
        return this._surplus;
    }


    constructor(office: Office, id: string, sourcePos: RoomPosition, franchisePos: RoomPosition) {
        let mapAnalyst = global.boardroom?.managers.get('MapAnalyst') as MapAnalyst;

        this.pos = franchisePos;
        this.sourcePos = sourcePos;
        this.id = id;
        this.officeId = office?.name;
        this.maxSalesmen = mapAnalyst?.calculateAdjacentPositions(sourcePos)
                                     .filter(pos => mapAnalyst.isPositionWalkable(pos, true)).length
    }
}
class CachedSource {
    @Transform(transformRoomPosition)
    public pos: RoomPosition;
    public roomName: string;
    public owner: string|undefined;
    public my: boolean

    constructor(controller: StructureController) {
        this.pos = controller.pos;
        this.roomName = controller.room.name;
        this.owner = controller.owner?.username;
        this.my = controller.my;
    }
}

class SalesAnalystMemory extends BoardroomManagerMemory {
    @Type(() => CachedSource)
    public sources: Map<string, CachedSource> = new Map();
    @Type(() => Franchise)
    public franchises: Map<string, Franchise> = new Map();
}

export class SalesAnalyst extends BoardroomManager {
    cache = new SalesAnalystMemory();

    plan() {
        this.boardroom.offices.forEach(office => {
            let territories = [office.center, ...office.territories]
            // If necessary, add franchise locations for territory
            territories.forEach(t => {
                t.sources.forEach((s, id) => {
                    if (!this.cache.franchises.has(id)) {
                        this.cache.franchises.set(id, new Franchise(office, id, s, this.calculateBestMiningLocation(office, s)));
                    }
                })
            })
        })
    }
    reset() { this.cache = new SalesAnalystMemory() }

    @Memoize((office: Office, sourcePos: RoomPosition) => ('' + office.name + sourcePos.toString() + Game.time))
    calculateBestMiningLocation(office: Office, sourcePos: RoomPosition) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let spawn = hrAnalyst.getSpawns(office)[0];
        let route = PathFinder.search(sourcePos, spawn.pos);
        if (route.incomplete) throw new Error('Unable to calculate mining location');
        return route.path[0];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getFranchiseLocations(office: Office) {
        let territories = [office.center, ...office.territories].map(t => t.name)
        return Array.from(this.cache.franchises.values()).filter(f => territories.includes(f.pos.roomName))
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getSources (office: Office) {
        let territories = [office.center, ...office.territories].map(t => t.name)
        return Array.from(this.cache.franchises.values()).filter(f => territories.includes(f.pos.roomName)).map(f => f.sourcePos);
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getUntappedSources(office: Office) {
        return this.getFranchiseLocations(office).filter(franchise => !this.isFranchiseTapped(franchise))
    }
    @Memoize((source: RoomPosition) => ('' + source.toString() + Game.time))
    isFranchiseTapped(franchise: Franchise) {
        if (franchise.salesmen.reduce((a, b) => (a + b.getActiveBodyparts(WORK)), 0) >= 5) {
            // Assigned creeps have enough WORK parts to tap the source
            return true;
        } else if (franchise.salesmen.length >= franchise.maxSalesmen) {
            // Assigned creeps have allocated all spaces around the source
            return true;
        }
        return false;
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getMaxEffectiveInput(office: Office) {
        let minionWorkParts = new SalesmanMinion().scaleMinion(office.center.room.energyCapacityAvailable)
                                               .filter(p => p === WORK).length;

        // Max energy output per tick
        return 2 * this.getFranchiseLocations(office).reduce((sum, franchise) => (
            sum + Math.max(5, minionWorkParts * franchise.maxSalesmen)
        ), 0)
    }
}
