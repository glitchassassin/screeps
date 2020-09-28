export class HaulerMinion {
    spawn = (spawn: StructureSpawn, memory: CreepMemory, energy: number) => {
        let scale = this.scaleMinion(energy);
        if (scale.length === 0) return false;
        return spawn.spawnCreep(scale, `hauler${Game.time}`, {
            memory: this.buildMinion(memory)
        }) === OK;
    }
    scaleMinion = (energy: number) => {
        // 2/3 CARRY, 1/3 MOVE
        let moveParts = Math.floor(energy/3/50)
        let carryParts = 2 * moveParts;

        return [...Array(carryParts).fill(CARRY), ...Array(moveParts).fill(MOVE)];
    }
    buildMinion = (memory: CreepMemory) => {
        return {
            favoredTasks: ['TransferTask'],
            ...memory,
            type: 'HAULER'
        };
    }
}
