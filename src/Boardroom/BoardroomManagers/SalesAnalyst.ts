import { CachedSource, Sources } from "WorldState/Sources";
import { DefenseAnalyst, TerritoryIntent } from "./DefenseAnalyst";

import { Boardroom } from "Boardroom/Boardroom";
import { BoardroomManager } from "Boardroom/BoardroomManager";
import { FranchiseData } from "WorldState/FranchiseData";
import { MapAnalyst } from "./MapAnalyst";
import { Memoize } from "typescript-memoize";
import { Office } from "Office/Office";
import { RoomArchitect } from "./Architects/RoomArchitect";
import { RoomData } from "WorldState/Rooms";
import { SalesManager } from "Office/OfficeManagers/SalesManager";
import { SalesmanMinion } from "MinionDefinitions/SalesmanMinion";
import { calculateFranchiseSurplus } from "utils/gameObjectSelectors";

export class SalesAnalyst extends BoardroomManager {
    constructor(
        boardroom: Boardroom,
        public mapAnalyst = boardroom.managers.get('MapAnalyst') as MapAnalyst
    ) {
        super(boardroom);
    }

    plan() {
        let roomArchitect = this.boardroom.managers.get('RoomArchitect') as RoomArchitect;
        this.boardroom.offices.forEach(office => {
            // If necessary, add franchise locations for territory
            for (let t of RoomData.byOffice(office)) {
                for (let s of Sources.byRoom(t.name)) {
                    let franchise = FranchiseData.byId(s.id) ?? {id: s.id}
                    // Initialize properties
                    if (!franchise.maxSalesmen) {
                        franchise.maxSalesmen = 0;
                        for (let pos of this.mapAnalyst?.calculateAdjacentPositions(s.pos)) {
                            if (this.mapAnalyst.isPositionWalkable(pos, true)) franchise.maxSalesmen += 1;
                        }
                    }
                    if (!franchise.containerPos || !franchise.linkPos) {
                        let {container, link} = roomArchitect.franchises.get(s.id) ?? {};
                        franchise.containerPos = container?.pos;
                        franchise.linkPos = link?.pos;
                    }
                }
            }
        })
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getUsableSourceLocations(office: Office) {
        let defenseAnalyst = this.boardroom.managers.get('DefenseAnalyst') as DefenseAnalyst;
        let usableSources: CachedSource[] = [];
        for (let room of RoomData.byOffice(office) ?? []) {
            if (defenseAnalyst.getTerritoryIntent(room.name) === TerritoryIntent.EXPLOIT) {
                usableSources.push(...Sources.byRoom(room.name))
            }
        }
        return usableSources;
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getSources (office: Office) {
        let usableSources: CachedSource[] = [];
        for (let room of RoomData.byOffice(office) ?? []) {
            usableSources.push(...(Sources.byRoom(room.name)));
        }
        return usableSources;
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getUntappedSources(office: Office) {
        let salesManager = office.managers.get('SalesManager') as SalesManager
        return this.getUsableSourceLocations(office).filter(source => !salesManager.isSourceTapped(source))
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    unassignedHarvestRequests(office: Office) {
        return (office.managers.get('SalesManager') as SalesManager).requests.filter(r => !r.capacityMet());
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getMaxEffectiveInput(office: Office) {
        let minionWorkParts = new SalesmanMinion().scaleMinion(office.center.gameObj.energyCapacityAvailable)
                                               .filter(p => p === WORK).length;

        // Max energy output per tick
        return 2 * this.getUsableSourceLocations(office).reduce((sum, source) => (
            sum + Math.max(5, minionWorkParts * (FranchiseData.byId(source.id)?.maxSalesmen ?? 0))
        ), 0)
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getFranchiseSurplus(office: Office) {
        // Sum of surpluses across franchises
        let franchises = this.getUsableSourceLocations(office)
        let surplus = franchises.reduce((sum, source) => sum + calculateFranchiseSurplus(source), 0);
        return (surplus / (franchises.length * CONTAINER_CAPACITY))
    }
}
