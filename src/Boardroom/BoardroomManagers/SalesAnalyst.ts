import { CachedSource, Sources } from "WorldState/Sources";
import { DefenseAnalyst, TerritoryIntent } from "./DefenseAnalyst";
import { calculateFranchiseSurplus, sortByDistanceTo } from "utils/gameObjectSelectors";

import { Boardroom } from "Boardroom/Boardroom";
import { BoardroomManager } from "Boardroom/BoardroomManager";
import { FranchiseData } from "WorldState/FranchiseData";
import { MapAnalyst } from "../../Analysts/MapAnalyst";
import { MemoizeByTick } from "utils/memoize";
import { Office } from "Office/Office";
import { RoomArchitect } from "./Architects/RoomArchitect";
import { RoomData } from "WorldState/Rooms";
import { SalesManager } from "Office/OfficeManagers/SalesManager";
import { SalesmanMinion } from "MinionDefinitions/SalesmanMinion";

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
                    if (!franchise.containerPos) {
                        let {container, link} = roomArchitect.franchises.get(s.id) ?? {};
                        franchise.containerPos = container?.pos;
                        if (office.name === t.name) {
                            franchise.linkPos = link?.pos;
                        }
                    }
                    if (!franchise.distance) {
                        franchise.distance = PathFinder.search(office.controller.pos, { pos: franchise.pos, range: 1 }).cost;
                    }

                    FranchiseData.set(s.id, franchise, office.name);
                }
            }
        })
    }
    @MemoizeByTick((office: Office) => office.name)
    getUsableSourceLocations(office: Office) {
        let defenseAnalyst = this.boardroom.managers.get('DefenseAnalyst') as DefenseAnalyst;
        let usableSources: CachedSource[] = [];
        let canExploit = Math.max(2, office.controller.level + 1);
        for (let room of RoomData.byOffice(office) ?? []) {
            if (defenseAnalyst.getTerritoryIntent(room.name) === TerritoryIntent.EXPLOIT) {
                usableSources.push(...Sources.byRoom(room.name))
            }
        }
        return usableSources.sort(sortByDistanceTo(office.controller.pos)).slice(0, canExploit);
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
    getUntappedSources(office: Office) {
        let salesManager = office.managers.get('SalesManager') as SalesManager
        return this.getUsableSourceLocations(office).filter(source => !salesManager.isSourceTapped(source))
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
        return 2 * this.getUsableSourceLocations(office).reduce((sum, source) => (
            sum + Math.max(5, minionWorkParts * (FranchiseData.byId(source.id)?.maxSalesmen ?? 0))
        ), 0)
    }
    @MemoizeByTick((office: Office) => office.name)
    getFranchiseSurplus(office: Office) {
        // Sum of surpluses across franchises
        let franchises = this.getUsableSourceLocations(office)
        let surplus = franchises.reduce((sum, source) => sum + calculateFranchiseSurplus(source), 0);
        return (surplus / (franchises.length * CONTAINER_CAPACITY))
    }
}
