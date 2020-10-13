export class LawyerMinion {
    spawn = (spawn: StructureSpawn, memory: CreepMemory, energy: number) => {
        let scale = this.scaleMinion(energy);
        if (scale.length === 0) return false;
        return spawn.spawnCreep(scale, `lawyer${Game.time}`, {
            memory: this.buildMinion(memory)
        }) === OK;
    }
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Equal claim and move parts
            let claimParts = Math.floor(((600/650) * energy) / 600)
            return [
                ...Array(claimParts).fill(CLAIM),
                ...Array(claimParts).fill(MOVE),
            ]
        }
    }
    buildMinion = (memory: CreepMemory) => {
        return {
            ...memory,
            type: 'LAWYER'
        };
    }
}
