export class MinerMinion {
    spawn = (spawn: StructureSpawn, memory: CreepMemory, energy: number) => {
        let scale = this.scaleMinion(energy);
        if (scale.length === 0) return false;
        return spawn.spawnCreep(scale, `miner${Game.time}`, {
            memory: this.buildMinion(memory)
        }) === OK;
    }
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        } else if (energy < 550) {
            let workParts = Math.floor((1/2) * energy / 100)
            let carryParts = Math.floor((1/4) * energy / 50)
            let moveParts = Math.floor((1/4) * energy / 50)
            return [
                ...Array(workParts).fill(WORK),
                ...Array(carryParts).fill(CARRY),
                ...Array(moveParts).fill(MOVE)
            ]
        } else {
            // Largest effective size for a Miner with stationary container
            return [
                ...Array(5).fill(WORK),
                MOVE
            ]
        }
    }
    buildMinion = (memory: CreepMemory) => {
        return {
            favoredTasks: ['HarvestTask'],
            ...memory,
            type: 'MINER'
        };
    }
}
