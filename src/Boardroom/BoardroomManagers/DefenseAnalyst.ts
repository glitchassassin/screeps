import { BoardroomManager } from "Boardroom/BoardroomManager";
import { Controllers } from "WorldState/Controllers";
import { HRAnalyst } from "./HRAnalyst";
import { MemoizeByTick } from "utils/memoize";
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
    @MemoizeByTick((office: Office) => office.name)
    getTowers(office: Office) {
        return Structures.byRoom(office.center.name).filter(s => s.structureType === STRUCTURE_TOWER) as StructureTower[];
    }

    @MemoizeByTick((office: Office) => office.name)
    getPrioritizedAttackTargets(office: Office) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst;
        let [spawn] = hrAnalyst.getSpawns(office);
        if (!spawn) return [];
        let hostileCreeps = Game.rooms[office.center.name].find(FIND_HOSTILE_CREEPS).filter(
            c => (!WHITELIST.includes(c.owner.username))
        );
        return hostileCreeps.sort(sortByDistanceTo(spawn.pos));
    }
    @MemoizeByTick((office: Office) => office.name)
    getPrioritizedHealTargets(office: Office) {
        let myCreeps = Game.rooms[office.center.name].find(FIND_MY_CREEPS).filter(
            c => {
                return c.pos.roomName === office.center.name && (c.hits < c.hitsMax)
            }
        )
        return myCreeps.sort((a, b) => b.hits - a.hits);
    }
    @MemoizeByTick((office: Office) => office.name)
    getInterns(office: Office) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst
        return hrAnalyst.getEmployees(office, 'INTERN');
    }
    @MemoizeByTick((office: Office) => office.name)
    getGuards(office: Office) {
        let hrAnalyst = this.boardroom.managers.get('HRAnalyst') as HRAnalyst
        return hrAnalyst.getEmployees(office, 'GUARD');
    }
    @MemoizeByTick((roomName: string) => roomName)
    getTerritoryScanned(roomName: string) {
        return RoomData.byRoom(roomName)?.scanned
    }
    @MemoizeByTick((roomName: string) => roomName)
    getTerritoryIntent(roomName: string) {
        let controller = Controllers.byRoom(roomName);
        if (controller && controller?.my || controller?.owner === undefined) {
            return TerritoryIntent.EXPLOIT;
        } else {
            return TerritoryIntent.IGNORE;
        }
    }
}
