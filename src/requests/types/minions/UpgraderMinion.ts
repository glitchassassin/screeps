export class UpgraderMinion {
    spawn = (spawn: StructureSpawn, memory: CreepMemory, energy: number) => {
        let scale = this.scaleMinion(energy);
        if (!scale) return false;
        return spawn.spawnCreep(scale, `upgrader${Game.time}`, {
            memory: this.buildMinion(memory)
        }) === OK;
    }
    scaleMinion = (energy: number) => {
        if (energy < 200) {
            return [];
        }
        else {
            // Max for an upgrader at RCL8 is 15 energy/tick, so we'll cap these there
            let workParts = Math.min(15, Math.floor((energy - 100) / 100))
            return [...Array(workParts).fill(WORK), CARRY, MOVE]
        }
    }
    buildMinion = (memory: CreepMemory) => {
        return {
            favoredTasks: ['UpgradeTask'],
            ...memory,
            type: 'UPGRADER'
        };
    }
}
