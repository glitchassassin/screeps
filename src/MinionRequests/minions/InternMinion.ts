export class InternMinion {
    spawn = (spawn: StructureSpawn, memory: CreepMemory, energy: number) => {
        let scale = this.scaleMinion(energy);
        if (scale.length === 0) return false;
        return spawn.spawnCreep(scale, `intern${Game.time}`, {
            memory: this.buildMinion(memory)
        }) === OK;
    }
    scaleMinion = (energy: number) => {
        return [TOUGH, TOUGH, MOVE, MOVE, MOVE, MOVE];
    }
    buildMinion = (memory: CreepMemory) => {
        return {
            ...memory,
            type: 'INTERN'
        };
    }
}
