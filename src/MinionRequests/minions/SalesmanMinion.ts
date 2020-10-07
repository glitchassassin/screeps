/**
 * Dedicated Miner: moves to mine and dumps resources into container, does not haul
 */
export class SalesmanMinion {
    spawn = (spawn: StructureSpawn, memory: CreepMemory, energy: number) => {
        let scale = this.scaleMinion(energy);
        if (scale.length === 0) return false;
        return spawn.spawnCreep(scale, `salesman${Game.time}`, {
            memory: this.buildMinion(memory)
        }) === OK;
    }
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        } else {
            let workParts = Math.min(5, Math.floor((energy * 2/3) / 100))
            let moveParts = Math.min(5, Math.floor((energy * 1/3) / 50))
            return [
                ...Array(workParts).fill(WORK),
                ...Array(moveParts).fill(MOVE),
            ]
        }
    }
    buildMinion = (memory: CreepMemory) => {
        return {
            favoredTasks: ['HarvestTask'],
            ...memory,
            type: 'SALESMAN',
            spawned: Game.time,
        };
    }
}
