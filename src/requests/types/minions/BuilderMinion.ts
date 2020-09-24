export class BuilderMinion {
    spawn = (spawn: StructureSpawn, memory: CreepMemory, energy: number) => {
        let scale = this.scaleMinion(energy);
        if (!scale) return false;
        return spawn.spawnCreep(scale, `builder${Game.time}`, {
            memory: this.buildMinion(memory)
        }) === OK;
    }
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Try to maintain WORK/CARRY/MOVE ratio
            let workParts = Math.floor(((1/2) * energy) / 100)
            let carryMoveParts = Math.floor(((1/4) * energy) / 50)
            return [
                ...Array(workParts).fill(WORK),
                ...Array(carryMoveParts).fill(CARRY),
                ...Array(carryMoveParts).fill(MOVE)
            ]
        }
    }
    buildMinion = (memory: CreepMemory) => {
        return {
            favoredTasks: ['BuildTask', 'RepairTask'],
            ...memory,
            type: 'BUILDER'
        };
    }
}
