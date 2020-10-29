import { Boardroom } from "Boardroom/Boardroom";
import { BoardroomManager } from "Boardroom/BoardroomManager";
import { CachedSource } from "WorldState/branches/WorldSources";
import { HRAnalyst } from "./HRAnalyst";
import { MapAnalyst } from "./MapAnalyst";
import { Memoize } from "typescript-memoize";
import { Office } from "Office/Office";
import { SalesmanMinion } from "MinionRequests/minions/SalesmanMinion";
import { TerritoryIntent } from "./DefenseAnalyst";
import { lazyFilter } from "utils/lazyIterators";

export class SalesAnalyst extends BoardroomManager {
    constructor(
        boardroom: Boardroom,
        public mapAnalyst = boardroom.managers.get('MapAnalyst') as MapAnalyst
    ) {
        super(boardroom);
    }

    plan() {
        this.boardroom.offices.forEach(office => {
            let territories = [office.center, ...office.territories]
            // If necessary, add franchise locations for territory
            for (let t of territories) {
                for (let s of global.worldState.sources.byRoom.get(t.name) ?? []) {
                    // Initialize properties
                    if (!s.maxSalesmen) {
                        s.maxSalesmen = 0;
                        for (let pos of this.mapAnalyst?.calculateAdjacentPositions(s.pos)) {
                            if (this.mapAnalyst.isPositionWalkable(pos, true)) s.maxSalesmen += 1;
                        }
                    }
                    if (!s.officeId) {
                        s.officeId = office.name;
                    }
                    if (!s.franchisePos) {
                        s.franchisePos = this.calculateBestMiningLocation(office, s.pos);
                    }
                }
            }
        })
    }

    @Memoize((office: Office, sourcePos: RoomPosition) => ('' + office.name + sourcePos.toString() + Game.time))
    calculateBestMiningLocation(office: Office, sourcePos: RoomPosition) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let spawn = hrAnalyst.getSpawns(office)[0];
        let route = PathFinder.search(sourcePos, spawn.pos);
        if (route.incomplete) throw new Error('Unable to calculate mining location');
        return route.path[0];
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getUsableSourceLocations(office: Office) {
        let territories = [office.center, ...office.territories.filter(t => t.intent === TerritoryIntent.EXPLOIT)];
        return territories.flatMap(t => Array.from(global.worldState.sources.byRoom.get(t.name) ?? []))
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getSources (office: Office) {
        let territories = [office.center, ...office.territories];
        return territories.flatMap(t => Array.from(global.worldState.sources.byRoom.get(t.name) ?? []));
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getUntappedSources(office: Office) {
        return this.getUsableSourceLocations(office).filter(source => !this.isSourceTapped(source))
    }
    @Memoize((source) => ('' + source.toString() + Game.time))
    isSourceTapped(source: CachedSource) {
        let count = 0;
        let workParts = 0;
        for (let salesman of lazyFilter(
            global.worldState.creeps.byOffice.get(source.officeId as string) ?? [],
            c => c.memory.source === source.id
        )) {
            count += 1;
            workParts += salesman.gameObj.getActiveBodyparts(WORK);
            if (workParts >= 5 || (source.maxSalesmen && count >= source.maxSalesmen)) {
                return true;
            }
        }
        return false;
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getMaxEffectiveInput(office: Office) {
        let minionWorkParts = new SalesmanMinion().scaleMinion(office.center.room.energyCapacityAvailable)
                                               .filter(p => p === WORK).length;

        // Max energy output per tick
        return 2 * this.getUsableSourceLocations(office).reduce((sum, source) => (
            sum + Math.max(5, minionWorkParts * source.maxSalesmen)
        ), 0)
    }
}
