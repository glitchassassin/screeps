import { CachedFranchise, FranchiseData } from "WorldState/FranchiseData";
import { CachedSource, Sources } from "WorldState/Sources";
import { DefenseAnalyst, TerritoryIntent } from "./DefenseAnalyst";

import { Boardroom } from "Boardroom/Boardroom";
import { BoardroomManager } from "Boardroom/BoardroomManager";
import { MapAnalyst } from "../../Analysts/MapAnalyst";
import { MemoizeByTick } from "utils/memoize";
import { Office } from "Office/Office";
import { RoomArchitect } from "./Architects/RoomArchitect";
import { RoomData } from "WorldState/Rooms";
import { SalesManager } from "Office/OfficeManagers/SalesManager";
import { SalesmanMinion } from "MinionDefinitions/SalesmanMinion";
import { calculateFranchiseSurplus } from "utils/gameObjectSelectors";

export class SalesAnalyst extends BoardroomManager {
    constructor(
        boardroom: Boardroom
    ) {
        super(boardroom);
    }

    plan() {
        let roomArchitect = this.boardroom.managers.get('RoomArchitect') as RoomArchitect;
        this.boardroom.offices.forEach(office => {
            // If necessary, add franchise locations for territory
            for (let t of RoomData.byOffice(office)) {
                for (let s of Sources.byRoom(t.name)) {
                    let franchise = FranchiseData.byId(s.id) ?? {id: s.id, pos: s.pos}
                    // Initialize properties
                    if (!franchise.maxSalesmen) {
                        franchise.maxSalesmen = 0;
                        for (let pos of MapAnalyst.calculateAdjacentPositions(s.pos)) {
                            if (MapAnalyst.isPositionWalkable(pos, true)) franchise.maxSalesmen += 1;
                        }
                    }
                    FranchiseData.set(s.id, franchise, s.pos.roomName);
                }
            }
        })
    }
    @MemoizeByTick((office: Office) => office.name)
    getExploitableSources(office: Office): CachedSource[] {
        return this.getExploitableFranchises(office).map(f => Sources.byId(f.id)).filter(s => s) as CachedSource[];
    }
    @MemoizeByTick((office: Office) => office.name)
    getExploitableFranchises(office: Office): CachedFranchise[] {
        let defenseAnalyst = this.boardroom.managers.get('DefenseAnalyst') as DefenseAnalyst;
        let canExploit = Math.max(2, office.controller.level + 1);
        return FranchiseData.byOffice(office)
            .filter(f => f.distance && defenseAnalyst.getTerritoryIntent(f.pos.roomName) === TerritoryIntent.EXPLOIT)
            .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? -Infinity))
            .slice(0, canExploit)
    }
    @MemoizeByTick((office: Office) => office.name)
    getSources (office: Office) {
        let usableSources: CachedSource[] = [];
        for (let room of RoomData.byOffice(office) ?? []) {
            usableSources.push(...(Sources.byRoom(room.name)));
        }
        return usableSources;
    }
    @MemoizeByTick((office: Office) => office.name)
    unassignedHarvestRequests(office: Office) {
        return (office.managers.get('SalesManager') as SalesManager).requests.filter(r => !r.capacityMet());
    }
    @MemoizeByTick((office: Office) => office.name)
    getMaxEffectiveInput(office: Office) {
        let minionWorkParts = new SalesmanMinion().scaleMinion(Game.rooms[office.name].energyCapacityAvailable)
                                               .filter(p => p === WORK).length;

        // Max energy output per tick
        return 2 * this.getExploitableFranchises(office).reduce((sum, franchise) => (
            sum + Math.max(5, minionWorkParts * (franchise.maxSalesmen ?? 0))
        ), 0)
    }
    @MemoizeByTick((office: Office) => office.name)
    getFranchiseSurplus(office: Office) {
        // Sum of surpluses across franchises
        let franchises = this.getExploitableFranchises(office)
        let surplus = franchises.reduce((sum, franchise) => sum + calculateFranchiseSurplus(franchise), 0);
        return (surplus / (franchises.length * CONTAINER_CAPACITY))
    }
}
