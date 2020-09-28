
import { Office } from "Office/Office";
import { SalesmanMinion } from "MinionRequests/minions/SalesmanMinion";
import { Memoize } from "typescript-memoize";
import { Analyst } from "./Analyst";
import { MapAnalyst } from "./MapAnalyst";
import { off } from "process";

export type Franchise = {
    pos: RoomPosition,
    id: string,
    source?: Source,
    container?: StructureContainer,
    constructionSite?: ConstructionSite,
    salesmen: Creep[]
}

export class SalesAnalyst extends Analyst {
    @Memoize((office: Office) => ('' + office.name))
    calculateBestMiningLocations(office: Office) {
        let locations: {source: Source, route: PathFinderPath}[] = [];
        let spawn = global.analysts.spawn.getSpawns(office)[0];
        let territories = [office.center, ...office.territories]

        territories.forEach(t => {
            let sources = t.room.find(FIND_SOURCES);
            locations.push(...sources.map(source => {
                let route = PathFinder.search(source.pos, spawn.pos);
                if (route) locations.push({source, route});
                return {
                    source,
                    route
                }
            }))
        })

        // Sorted by distance from spawn
        return locations.sort((a, b) => (a.route.cost - b.route.cost)).map(s => ({
            pos: s.route.path[0],
            sourceId: s.source.id
        }));
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getFranchiseLocations(office: Office) {
        let salesmen = office.employees.filter(creep => creep.memory.type === 'SALESMAN')
        return Object.values(Game.flags)
            .filter(flag => flag.memory.source)
            .map(flag => {
                let mine: Franchise = {
                    pos: flag.pos,
                    id: (flag.memory.source as string),
                    source: Game.getObjectById(flag.memory.source as Id<Source>) || undefined,
                    salesmen: salesmen.filter(m => m.memory.source === flag.memory.source)
                }
                flag.pos.look().forEach(obj => {
                    if (obj.type === LOOK_STRUCTURES && obj.structure?.structureType === STRUCTURE_CONTAINER) {
                        mine.container = obj.structure as StructureContainer
                    } else if (obj.type === LOOK_CONSTRUCTION_SITES && obj.constructionSite?.structureType === STRUCTURE_CONTAINER) {
                        mine.constructionSite = obj.constructionSite as ConstructionSite
                    }
                });
                return mine;
            });
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getSources (office: Office) {
        let territories = [office.center, ...office.territories]
        return territories.map(t => t.room.find(FIND_SOURCES)).reduce((a, b) => (a.concat(b)), []);
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getUntappedSources(office: Office) {
        return this.getSources(office).filter(source => {
            // Assume all creeps adjacent to a source are actively working it
            if (source.pos.findInRange(FIND_CREEPS, 1)
                .reduce((a, b) => (a + b.getActiveBodyparts(WORK) * 2), 0) >= 10) {
                // Adjacent creeps have enough WORK parts to tap the source
                return false;
            } else if (global.analysts.map.calculateAdjacentPositions(source.pos)
                             .filter(pos => global.analysts.map.isPositionWalkable(pos)).length === 0) {
                return false;
            }
            return true;
        })
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getMaxEffectiveInput(office: Office) {
        let minionWorkParts = new SalesmanMinion().scaleMinion(office.center.room.energyCapacityAvailable)
                                               .filter(p => p === WORK).length;

        // Max energy output per tick
        return 2 * this.getSources(office).reduce((sum, source) => (
            sum + Math.max(
                5,
                minionWorkParts * global.analysts.map.calculateAdjacentPositions(source.pos)
                                        .filter(pos => global.analysts.map.isPositionWalkable(pos)).length
            )),
        0)
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getMinimumMiners(office: Office) {
        let minionWorkParts = new SalesmanMinion().scaleMinion(office.center.room.energyCapacityAvailable)
                                               .filter(p => p === WORK).length;

        // Theoretical minimum number of miners to max out all sources, working simultaneously
        return this.getSources(office).reduce((sum, source) => (
            sum + Math.max(
                5,
                Math.max(
                    global.analysts.map.calculateAdjacentPositions(source.pos)
                          .filter(pos => global.analysts.map.isPositionWalkable(pos)).length,
                    Math.ceil(5 / minionWorkParts)
                )
            )),
        0)
    }
}
