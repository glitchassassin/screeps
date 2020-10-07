
import { Office } from "Office/Office";
import { SalesmanMinion } from "MinionRequests/minions/SalesmanMinion";
import { Memoize } from "typescript-memoize";
import { BoardroomManager } from "Boardroom/BoardroomManager";
import { HRAnalyst } from "./HRAnalyst";
import { MapAnalyst } from "./MapAnalyst";
import { countEnergyInContainersOrGround } from "utils/gameObjectSelectors";

export interface Franchise {
    pos: RoomPosition,
    sourcePos: RoomPosition;
    id: Id<Source>;
    officeId: string;
    maxSalesmen: number;
    source?: Source;
    container?: StructureContainer;
    constructionSite?: ConstructionSite;
    office?: Office;
    salesmen: Creep[];
    surplus?: number;
}

const franchiseProxy = (franchise: Franchise): Franchise => {
    return new Proxy(franchise, {
        get: (target, prop: keyof Franchise) => {
            if (!target) {
                return undefined;
            } else if (prop === 'pos' && target.pos) {
                return new RoomPosition(target.pos.x, target.pos.y, target.pos.roomName);
            } else if (prop === 'sourcePos' && target.sourcePos) {
                return new RoomPosition(target.sourcePos.x, target.sourcePos.y, target.sourcePos.roomName);
            } else if (prop === 'source') {
                return Game.getObjectById(target.id) ?? undefined;
            } else if (prop === 'container') {
                if (!Game.rooms[target.pos.roomName]) return undefined;
                let pos = new RoomPosition(target.pos.x, target.pos.y, target.pos.roomName);
                return (pos.lookFor(LOOK_STRUCTURES).find(s => s.structureType === STRUCTURE_CONTAINER) as StructureContainer|undefined);
            } else if (prop === 'constructionSite') {
                if (!Game.rooms[target.pos.roomName]) return undefined;
                let pos = new RoomPosition(target.pos.x, target.pos.y, target.pos.roomName);
                return (pos.lookFor(LOOK_CONSTRUCTION_SITES).find(s => s.structureType === STRUCTURE_CONTAINER) as ConstructionSite|undefined);
            } else if (prop === 'office') {
                return global.boardroom.offices.get(target.officeId);
            } else if (prop === 'salesmen') {
                return global.boardroom.offices.get(target.officeId)?.employees.filter(c => c.memory.source === target.id) || [];
            } else if (prop === 'surplus') {
                if (Game.rooms[target.pos.roomName]) target.surplus = countEnergyInContainersOrGround(new RoomPosition(target.sourcePos.x, target.sourcePos.y, target.sourcePos.roomName));
                return target.surplus;
            } else {
                return target[prop];
            }
        }
    })
}

const franchisesProxy = (franchises: {[id: string]: Franchise}): {[id: string]: Franchise} => {
    return new Proxy(franchises, {
        get: (target, prop: string) => {
            if (target[prop]) {
                return franchiseProxy(target[prop]);
            }
            return undefined;
        }
    })
}

const unwrapFranchise = (office: Office, id: string, sourcePos: RoomPosition, franchisePos: RoomPosition) => {
    let mapAnalyst = global.boardroom?.managers.get('MapAnalyst') as MapAnalyst;
    return {
        pos: franchisePos,
        sourcePos: sourcePos,
        id: id as Id<Source>,
        officeId: office?.name,
        salesmen: [],
        maxSalesmen: mapAnalyst?.calculateAdjacentPositions(sourcePos)
                                        .filter(pos => mapAnalyst.isPositionWalkable(pos, true)).length
    }
}

export class SalesAnalyst extends BoardroomManager {
    init() {
        Memory.boardroom.SalesAnalyst ||= {
            franchises: {}
        }
        Memory.boardroom.SalesAnalyst.franchises ||= {};
    }
    memory = {
        franchises: franchisesProxy(Memory.boardroom.SalesAnalyst.franchises),
    }

    plan() {
        this.boardroom.offices.forEach(office => {
            let territories = [office.center, ...office.territories]
            // If necessary, add franchise locations for territory
            territories.forEach(t => {
                t.sources.forEach((s, id) => {
                    if (t.isHostile && this.memory.franchises[id]) {
                        delete this.memory.franchises[id];
                        return;
                    }
                    if (!t.isHostile && !this.memory.franchises[id]) {
                        this.memory.franchises[id] = unwrapFranchise(office, id, s, this.calculateBestMiningLocation(office, s));
                    }
                })
            })
        })
    }
    reset() { Memory.boardroom.SalesAnalyst.franchises = {}; }

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
        let territories = [office.center, ...office.territories.filter(t => !t.isHostile)].map(t => t.name)
        return Object.values(this.memory.franchises).filter(f => territories.includes(f.pos.roomName))
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getSources (office: Office) {
        let territories = [office.center, ...office.territories].map(t => t.name)
        return Object.values(this.memory.franchises).filter(f => territories.includes(f.pos.roomName)).map(f => f.sourcePos);
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
