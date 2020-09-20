export class PioneerMinion {
    spawn = (spawn: StructureSpawn, memory: CreepMemory, energy: number) => {
        let scale = this.scaleMinion(energy);
        if (!scale) return false;
        return spawn.spawnCreep(scale, `pioneer${Game.time}`, {
            memory: this.buildMinion(memory)
        }) === OK;
    }
    scaleMinion = (energy: number) => {
        if (energy > 200 && energy < 550) {
            return [WORK, CARRY, MOVE]
        } else if (energy >= 550) {
            return [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE]
        }
        return null;
    }
    buildMinion = (memory: CreepMemory) => {
        return {
            ...memory,
            type: 'PIONEER'
        };
    }
}
