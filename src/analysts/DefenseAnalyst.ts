import { Office } from "Office/Office";
import { Memoize } from "typescript-memoize";
import { Analyst } from "./Analyst";

export class DefenseAnalyst extends Analyst {
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getTowers(office: Office) {
        return (office.center.room.find(FIND_MY_STRUCTURES).filter(s => s.structureType === STRUCTURE_TOWER) as StructureTower[]);
    }

    @Memoize((office: Office) => ('' + office.name + Game.time))
    getPrioritizedAttackTargets(office: Office) {
        let spawn = global.analysts.spawn.getSpawns(office)[0]
        return office.center.room.find(FIND_HOSTILE_CREEPS).sort((a, b) => b.pos.getRangeTo(spawn) - a.pos.getRangeTo(spawn));
    }
    @Memoize((office: Office) => ('' + office.name + Game.time))
    getPrioritizedHealTargets(office: Office) {
        return office.center.room.find(FIND_MY_CREEPS).filter(c => c.hits < c.hitsMax).sort((a, b) => b.hits - a.hits);
    }
}
