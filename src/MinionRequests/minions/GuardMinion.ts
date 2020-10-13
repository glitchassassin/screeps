export class GuardMinion {
    spawn = (spawn: StructureSpawn, memory: CreepMemory, energy: number) => {
        let scale = this.scaleMinion(energy);
        if (scale.length === 0) return false;
        return spawn.spawnCreep(scale, `guard${Game.time}`, {
            memory: this.buildMinion(memory)
        }) === OK;
    }
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Try to maintain ATTACK/MOVE ratio
            let attackParts = Math.floor(((1/2) * energy) / 80)
            return [
                ...Array(attackParts).fill(ATTACK),
                ...Array(attackParts).fill(MOVE),
            ]
        }
    }
    buildMinion = (memory: CreepMemory) => {
        return {
            favoredTasks: ['BuildTask', 'RepairTask'],
            ...memory,
            type: 'ENGINEER'
        };
    }
}
