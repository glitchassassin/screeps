import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Controllers } from "WorldState/Controllers";
import { HRAnalyst } from "./HRAnalyst";
import { Memoize } from "typescript-memoize";
import { Office } from "Office/Office";
import { RoomData } from "WorldState/Rooms";
import { Structures } from "WorldState/Structures";
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
        return Structures.byRoom(office.center.name).filter(s => s.structureType === STRUCTURE_TOWER) as StructureTower[];
    }

    @Memoize((office: Office) => ('' + office.name + Game.time))
    getPrioritizedAttackTargets(office: Office) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let [spawn] = hrAnalyst.getSpawns(office);
        if (!spawn) return [];
        let hostileCreeps = Game.rooms[office.center.name].find(FIND_HOSTILE_CREEPS).filter(
            c => (!WHITELIST.includes(c.owner.username))
        );
        return hostileCreeps.sort(sortByDistanceTo(spawn.pos));
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getPrioritizedHealTargets(office: Office) {
        let myCreeps = Game.rooms[office.center.name].find(FIND_MY_CREEPS).filter(
            c => {
                return c.pos.roomName === office.center.name && (c.hits < c.hitsMax)
            }
        )
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
        return RoomData.byRoom(roomName)?.scanned
    }
    @Memoize((roomName: string) => ('' + roomName + Game.time))
    getTerritoryIntent(roomName: string) {
        let controller = Controllers.byRoom(roomName);
        if (controller?.my) {
            return TerritoryIntent.EXPLOIT;
        } else {
            return TerritoryIntent.IGNORE;
        }
    }
}
