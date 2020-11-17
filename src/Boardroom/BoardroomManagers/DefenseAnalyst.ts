import { BoardroomManager } from "Boardroom/BoardroomManager";
import { CachedStructure } from "WorldState";
import { HRAnalyst } from "./HRAnalyst";
import { Memoize } from "typescript-memoize";
import { Office } from "Office/Office";
import { lazyFilter } from "utils/lazyIterators";
import { sortByDistanceTo } from "utils/gameObjectSelectors";

export enum TerritoryIntent {
    AVOID = 'AVOID',
    ACQUIRE = 'ACQUIRE',
    DEFEND = 'DEFEND',
    EXPLOIT = 'EXPLOIT',
    IGNORE = 'IGNORE'
}

export const WHITELIST = [
    'CrAzYDubC'
]

export class DefenseAnalyst extends BoardroomManager {
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getTowers(office: Office) {
        let structures = global.worldState.structures.byRoom.get(office.center.name) ?? [];
        return Array.from(lazyFilter(structures, s => s.structureType === STRUCTURE_TOWER)) as CachedStructure<StructureTower>[];
    }

    @Memoize((office: Office) => ('' + office.name + Game.time))
    getPrioritizedAttackTargets(office: Office) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let [spawn] = hrAnalyst.getSpawns(office);
        if (!spawn) return [];
        let hostileCreeps = Array.from(lazyFilter(
            global.worldState.hostileCreeps.byRoom.get(office.center.name) ?? [],
            c => (c.gameObj && !WHITELIST.includes(c.gameObj?.owner.username))
        ));
        return hostileCreeps.sort(sortByDistanceTo(spawn.pos));
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getPrioritizedHealTargets(office: Office) {
        let myCreeps = Array.from(lazyFilter(
            global.worldState.myCreeps.byOffice.get(office.center.name) ?? [],
            c => {
                return c.pos.roomName === office.center.name && (c.hits < c.hitsMax)
            }
        ))
        return myCreeps.sort((a, b) => b.hits - a.hits);
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getInterns(office: Office) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst
        return hrAnalyst.getEmployees(office, 'INTERN');
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getGuards(office: Office) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst
        return hrAnalyst.getEmployees(office, 'GUARD');
    }
    @Memoize((roomName: string) => ('' + roomName + Game.time))
    getTerritoryScanned(roomName: string) {
        return global.worldState.rooms.byRoom.get(roomName)?.scanned
    }
    @Memoize((roomName: string) => ('' + roomName + Game.time))
    getTerritoryIntent(roomName: string) {
        let controller = global.worldState.controllers.byRoom.get(roomName);
        if (controller?.my) {
            return TerritoryIntent.EXPLOIT;
        } else {
            return TerritoryIntent.IGNORE;
        }
    }
}
