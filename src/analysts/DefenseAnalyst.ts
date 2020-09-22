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
        let spawn = global.analysts.spawn.getSpawns(room)[0].spawn
        return room.find(FIND_HOSTILE_CREEPS).sort((a, b) => b.pos.getRangeTo(spawn) - a.pos.getRangeTo(spawn));
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getPrioritizedHealTargets(room: Room) {
        return room.find(FIND_MY_CREEPS).sort((a, b) => b.hits - a.hits);
    }
    @Memoize((room: Room) => ('' + room.name + Game.time))
    getPrioritizedRepairTargets(room: Room) {
        return room.find(FIND_STRUCTURES).filter(s => s.structureType !== STRUCTURE_WALL).sort((a, b) => b.hits - a.hits);
    }
}
