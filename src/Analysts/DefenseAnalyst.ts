import { Controllers } from "WorldState/Controllers";
import { HRAnalyst } from "./HRAnalyst";
import { MapAnalyst } from "./MapAnalyst";
import { MemoizeByTick } from "utils/memoize";
import type { Office } from "Office/Office";
import { RoomData } from "WorldState/Rooms";
import { RoomPlanningAnalyst } from "./RoomPlanningAnalyst";
import { Sources } from "WorldState/Sources";
import { Structures } from "WorldState/Structures";
import { WHITELIST } from "config";

export enum TerritoryIntent {
    AVOID = 'AVOID',
    ACQUIRE = 'ACQUIRE',
    DEFEND = 'DEFEND',
    EXPLOIT = 'EXPLOIT',
    IGNORE = 'IGNORE'
}

export class DefenseAnalyst {
    @MemoizeByTick((office: Office) => office.name)
    static getTowers(office: Office) {
        return Structures.byRoom(office.center.name).filter(s => s.structureType === STRUCTURE_TOWER) as StructureTower[];
    }

    @MemoizeByTick((office: Office) => office.name)
    static getPrioritizedAttackTargets(office: Office) {
        let [spawn] = HRAnalyst.getSpawns(office);
        if (!spawn) return [];
        let hostileCreeps = Game.rooms[office.center.name].find(FIND_HOSTILE_CREEPS).filter(
            c => (!WHITELIST.includes(c.owner.username))
        );
        return hostileCreeps.sort(MapAnalyst.sortByDistanceTo(spawn.pos));
    }
    @MemoizeByTick((office: Office) => office.name)
    static getPrioritizedHealTargets(office: Office) {
        let myCreeps = Game.rooms[office.center.name].find(FIND_MY_CREEPS).filter(
            c => {
                return c.pos.roomName === office.center.name && (c.hits < c.hitsMax)
            }
        )
        return myCreeps.sort((a, b) => b.hits - a.hits);
    }
    @MemoizeByTick((office: Office) => office.name)
    static getInterns(office: Office) {
        return HRAnalyst.getEmployees(office, 'INTERN');
    }
    @MemoizeByTick((office: Office) => office.name)
    static getGuards(office: Office) {
        return HRAnalyst.getEmployees(office, 'GUARD');
    }
    @MemoizeByTick((roomName: string) => roomName)
    static getTerritoryScanned(roomName: string) {
        return RoomData.byRoom(roomName)?.scanned
    }
    @MemoizeByTick((roomName: string) => roomName)
    static getTerritoryIntent(roomName: string): TerritoryIntent {
        let controller = Controllers.byRoom(roomName);
        let roomPlan = RoomPlanningAnalyst.getOfficeRoomPlan(roomName);
        let sources = Sources.byRoom(roomName);
        let room = RoomData.byRoom(roomName);
        if (!controller) {
            return TerritoryIntent.IGNORE;
        }
        // Return the saved intent, or remove it if expired
        if (room?.intent) {
            if (room.intentExpires && Game.time <= room.intentExpires) {
                return room.intent;
            } else {
                RoomData.set(roomName, {
                    ...room,
                    intent: undefined,
                    intentExpires: undefined
                })
            }
        }
        if (!controller.my && controller.owner?.username) {
            return TerritoryIntent.AVOID;
        } else if (roomPlan) {
            return TerritoryIntent.ACQUIRE;
        } else if (sources.length === 2) {
            return TerritoryIntent.EXPLOIT;
        } else {
            return TerritoryIntent.IGNORE;
        }
    }
}
