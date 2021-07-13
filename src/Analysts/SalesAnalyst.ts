import { CachedFranchise, FranchiseData } from "WorldState/FranchiseData";
import { CachedSource, Sources } from "WorldState/Sources";
import { DefenseAnalyst, TerritoryIntent } from "Analysts/DefenseAnalyst";

import { LogisticsAnalyst } from "./LogisticsAnalyst";
import { MemoizeByTick } from "utils/memoize";
import type { Office } from "Office/Office";
import { RoomData } from "WorldState/Rooms";
import { SalesManager } from "Office/OfficeManagers/SalesManager";
import { SalesmanMinion } from "MinionDefinitions/SalesmanMinion";
import { Structures } from "WorldState/Structures";

export class SalesAnalyst {
    @MemoizeByTick((office: Office) => office.name)
    static getExploitableSources(office: Office): CachedSource[] {
        return this.getExploitableFranchises(office).map(f => Sources.byId(f.id)).filter(s => s) as CachedSource[];
    }
    @MemoizeByTick((office: Office) => office.name)
    static getExploitableFranchises(office: Office): CachedFranchise[] {
        let spawnCount = Structures.byRoom(office.name).filter(s => s.structureType === STRUCTURE_SPAWN).length
        let canExploit = 2 * spawnCount;

        return FranchiseData.byOffice(office)
            .filter(f => f.distance && [TerritoryIntent.EXPLOIT, TerritoryIntent.ACQUIRE].includes(DefenseAnalyst.getTerritoryIntent(f.pos.roomName)))
            .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? -Infinity))
            .slice(0, canExploit)
    }
    @MemoizeByTick((office: Office) => office.name)
    static getSources(office: Office) {
        let usableSources: CachedSource[] = [];
        for (let room of RoomData.byOffice(office) ?? []) {
            usableSources.push(...(Sources.byRoom(room.name)));
        }
        return usableSources;
    }
    @MemoizeByTick((office: Office) => office.name)
    static unassignedHarvestRequests(office: Office) {
        return (office.managers.get('SalesManager') as SalesManager).requests.filter(r => !r.capacityMet());
    }
    @MemoizeByTick((office: Office) => office.name)
    static getMaxEffectiveInput(office: Office) {
        let minionWorkParts = new SalesmanMinion().scaleMinion(Game.rooms[office.name].energyCapacityAvailable)
                                               .filter(p => p === WORK).length;

        // Max energy output per tick
        return 2 * this.getExploitableFranchises(office).reduce((sum, franchise) => (
            sum + Math.max(5, minionWorkParts * (franchise.maxSalesmen ?? 0))
        ), 0)
    }
    @MemoizeByTick((office: Office) => office.name)
    static getFranchiseSurplus(office: Office) {
        // Sum of surpluses across franchises
        let franchises = this.getExploitableFranchises(office)
        let surplus = franchises.reduce((sum, franchise) => sum + LogisticsAnalyst.calculateFranchiseSurplus(franchise), 0);
        return (surplus / (franchises.length * CONTAINER_CAPACITY))
    }
}
