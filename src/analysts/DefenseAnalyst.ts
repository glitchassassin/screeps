import { Memoize } from "typescript-memoize";
import { Analyst } from "./Analyst";
import { MapAnalyst } from "./MapAnalyst";

const mapAnalyst = new MapAnalyst();

export class DefenseAnalyst extends Analyst {
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getTowers(room: Room) {
        return (room.find(FIND_MY_STRUCTURES).filter(s => s.structureType === STRUCTURE_TOWER) as StructureTower[]);
    }

    @Memoize((room: Room) => ('' + room.name + Game.time))
    getPrioritizedAttackTargets(room: Room) {
        let spawn = global.analysts.spawn.getSpawns(room)[0]
        return room.find(FIND_HOSTILE_CREEPS).sort((a, b) => a.pos.getRangeTo(spawn) - b.pos.getRangeTo(spawn));
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getPrioritizedHealTargets(room: Room) {
        return room.find(FIND_MY_CREEPS).filter(c => c.hits < c.hitsMax).sort((a, b) => a.hits - b.hits);
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getPrioritizedRepairTargets(room: Room) {
        return room.find(FIND_STRUCTURES).filter(c => {
            switch(c.structureType) {
                case STRUCTURE_RAMPART:
                    return c.hits < Math.min(c.hitsMax, 100000)
                case STRUCTURE_WALL:
                    return c.hits < Math.min(c.hitsMax, 100000)
                default:
                    return c.hits < c.hitsMax
            }
        }).sort((a, b) => a.hits - b.hits);
    }
}
