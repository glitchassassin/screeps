
import { Office } from "Office/Office";
import { SalesmanMinion } from "MinionRequests/minions/SalesmanMinion";
import { Memoize } from "typescript-memoize";
import { BoardroomManager } from "Boardroom/BoardroomManager";
import { HRAnalyst } from "./HRAnalyst";
import { MapAnalyst } from "./MapAnalyst";

export type Franchise = {
    pos: RoomPosition,
    sourcePos: RoomPosition,
    id: string,
    source?: Source,
    container?: StructureContainer,
    constructionSite?: ConstructionSite,
    salesmen: Creep[],
    maxSalesmen: number,
}

export class SalesAnalyst extends BoardroomManager {
    franchises: Franchise[] = [];
    @Memoize((office: Office, sourcePos: RoomPosition) => ('' + office.name + sourcePos.toString() + Game.time))
    calculateBestMiningLocation(office: Office, sourcePos: RoomPosition) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let spawn = hrAnalyst.getSpawns(office)[0];
        let route = PathFinder.search(sourcePos, spawn.pos);
        if (route.incomplete) throw new Error('Unable to calculate mining location');
        return {
            franchise: route.path[0],
            source: sourcePos
        }
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getFranchiseLocations(office: Office) {
        let mapAnalyst = this.boardroom.managers.get('MapAnalyst') as MapAnalyst;
        let salesmen = office.employees.filter(creep => creep.memory.type === 'SALESMAN')
        let territories = [office.center, ...office.territories]
        // If necessary, add franchise locations for territory
        territories.forEach(t => {
            t.sources.forEach((s, id) => {
                if (!office.franchiseLocations[id]) {
                    office.franchiseLocations[id] = this.calculateBestMiningLocation(office, s)
                }
            })
        })
        // Get memorized franchise locations
        return Object.entries(office.franchiseLocations).map(([sourceId, pos]) => {
            let mine: Franchise = {
                pos: pos.franchise,
                sourcePos: pos.source,
                id: sourceId,
                source: Game.getObjectById(sourceId as Id<Source>) || undefined,
                salesmen: salesmen.filter(m => m.memory.source === sourceId),
                maxSalesmen: mapAnalyst.calculateAdjacentPositions(pos.source).filter(p => mapAnalyst.isPositionWalkable(p, true)).length
            }
            if (Game.rooms[pos.franchise.roomName]) {
                // Requires visibility
                pos.franchise.look().forEach(obj => {
                    if (obj.type === LOOK_STRUCTURES && obj.structure?.structureType === STRUCTURE_CONTAINER) {
                        mine.container = obj.structure as StructureContainer
                    } else if (obj.type === LOOK_CONSTRUCTION_SITES && obj.constructionSite?.structureType === STRUCTURE_CONTAINER) {
                        mine.constructionSite = obj.constructionSite as ConstructionSite
                    }
                });
            }
            return mine;
        })
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getSources (office: Office) {
        let territories = [office.center, ...office.territories]
        return territories.map(t => [...t.sources.values()]).reduce((a, b) => (a.concat(b)), []);
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getUntappedSources(office: Office) {
        let mapAnalyst = this.boardroom.managers.get('MapAnalyst') as MapAnalyst;
        return this.getSources(office).filter(source => !this.isSourceTapped(source))
    }
    @Memoize((source: RoomPosition) => ('' + source.toString() + Game.time))
    isSourceTapped(source: RoomPosition) {
        let mapAnalyst = this.boardroom.managers.get('MapAnalyst') as MapAnalyst;

        // Assume all creeps adjacent to a source are actively working it
        if (Game.rooms[source.roomName] && source.findInRange(FIND_CREEPS, 1)
            .reduce((a, b) => (a + b.getActiveBodyparts(WORK) * 2), 0) >= 10) {
            // Adjacent creeps have enough WORK parts to tap the source
            return false;
        } else if (mapAnalyst.calculateAdjacentPositions(source)
                            .filter(pos => mapAnalyst.isPositionWalkable(pos)).length === 0) {
            return false;
        }
        return true;
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getMaxEffectiveInput(office: Office) {
        let mapAnalyst = this.boardroom.managers.get('MapAnalyst') as MapAnalyst;
        let minionWorkParts = new SalesmanMinion().scaleMinion(office.center.room.energyCapacityAvailable)
                                               .filter(p => p === WORK).length;

        // Max energy output per tick
        return 2 * this.getSources(office).reduce((sum, source) => (
            sum + Math.max(
                5,
                minionWorkParts * mapAnalyst.calculateAdjacentPositions(source)
                                        .filter(pos => mapAnalyst.isPositionWalkable(pos)).length
            )),
        0)
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getMinimumMiners(office: Office) {
        let mapAnalyst = this.boardroom.managers.get('MapAnalyst') as MapAnalyst;
        let minionWorkParts = new SalesmanMinion().scaleMinion(office.center.room.energyCapacityAvailable)
                                               .filter(p => p === WORK).length;

        // Theoretical minimum number of miners to max out all sources, working simultaneously
        return this.getSources(office).reduce((sum, source) => (
            sum + Math.max(
                5,
                Math.max(
                    mapAnalyst.calculateAdjacentPositions(source)
                          .filter(pos => mapAnalyst.isPositionWalkable(pos)).length,
                    Math.ceil(5 / minionWorkParts)
                )
            )),
        0)
    }
}
