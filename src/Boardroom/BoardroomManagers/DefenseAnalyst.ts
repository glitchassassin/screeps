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
    EXPLOIT = 'EXPLOIT'
}

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
        let hostileCreeps = Array.from(lazyFilter(
            global.worldState.creeps.byRoom.get(office.center.name) ?? [],
            c => !c.my
        ));
        return hostileCreeps.sort(sortByDistanceTo(spawn.pos));
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getPrioritizedHealTargets(office: Office) {
        let myCreeps = Array.from(lazyFilter(
            global.worldState.creeps.byRoom.get(office.center.name) ?? [],
            c => c.my && (c.hits < c.hitsMax)
        ))
        return myCreeps.sort((a, b) => b.hits - a.hits);
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getInterns(office: Office) {
        return Array.from(lazyFilter(
            global.worldState.creeps.byOffice.get(office.center.name) ?? [],
            c => c.memory.type === 'INTERN'
        ))
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getGuards(office: Office) {
        return Array.from(lazyFilter(
            global.worldState.creeps.byOffice.get(office.center.name) ?? [],
            c => c.memory.type === 'GUARD'
        ))
    }
    @Memoize((roomName: string) => ('' + roomName + Game.time))
    getTerritoryScanned(roomName: string) {
        return global.worldState.rooms.byRoom.get(roomName)?.scanned
    }
    @Memoize((roomName: string) => ('' + roomName + Game.time))
    getTerritoryIntent(roomName: string) {
        let controller = global.worldState.controllers.byRoom.get(roomName);
        let room = global.worldState.rooms.byRoom.get(roomName);
        let [hostileStructure] = lazyFilter(
            global.worldState.structures.byRoom.get(roomName) ?? [],
            s => ((
                s.structureType === STRUCTURE_SPAWN ||
                s.structureType === STRUCTURE_INVADER_CORE
            ) && !s.my)
        )
        let [hostileMinion] = lazyFilter(
            global.worldState.creeps.byRoom.get(roomName) ?? [],
            s => !s.my
        )
        if (
            (controller?.owner && !controller?.my) ||
            (controller?.reservationOwner && !controller?.myReserved)
        ) {
            if (!controller?.level || controller?.level < 3) {
                return TerritoryIntent.ACQUIRE;
            } else {
                return TerritoryIntent.AVOID;
            }
        } else {
            if (hostileStructure) {
                return TerritoryIntent.DEFEND;
            } else if (
                // Hostile activity in the last 100 ticks, and
                (room?.lastHostileActivity && room.lastHostileActivity < 100) &&
                // We cannot see the room, or we can and there are confirmed hostile minions
                !(Game.rooms[roomName] && hostileMinion)
            ) {
                return TerritoryIntent.DEFEND;
            } else {
                return TerritoryIntent.EXPLOIT;
            }
        }
    }
}
