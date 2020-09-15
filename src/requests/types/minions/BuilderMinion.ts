export class BuilderMinion {
    spawn = (spawn: StructureSpawn, memory: CreepMemory, energy: number) => {
        let scale = this.scaleMinion(energy);
        if (!scale) return false;
        return spawn.spawnCreep(scale, `builder${Game.time}`, {
            memory: this.buildMinion(memory)
        }) === OK;
    }
    scaleMinion = (energy: number) => {
        if (energy > 200 && energy < 550) {
            return [WORK, CARRY, MOVE]
        } else if (energy >= 550) {
            return [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE] // 550
        }
        return null;
    }
    buildMinion = (memory: CreepMemory) => {
        return {
            ...memory,
            type: 'BUILDER'
        };
    }
}
