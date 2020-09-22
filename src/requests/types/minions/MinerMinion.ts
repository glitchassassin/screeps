export class MinerMinion {
    spawn = (spawn: StructureSpawn, memory: CreepMemory, energy: number) => {
        let scale = this.scaleMinion(energy);
        if (!scale) return false;
        return spawn.spawnCreep(scale, `miner${Game.time}`, {
            memory: this.buildMinion(memory)
        }) === OK;
    }
    scaleMinion = (energy: number) => {
        if (energy > 200 && energy < 550) {
            return [WORK, CARRY, MOVE]
        } else if (energy >= 550) {
            // Largest effective size for a Miner with stationary container
            return [WORK, WORK, WORK, WORK, WORK, MOVE]
        }
        return null;
    }
    buildMinion = (memory: CreepMemory) => {
        return {
            favoredTasks: ['HarvestTask'],
            ...memory,
            type: 'MINER'
        };
    }
}
