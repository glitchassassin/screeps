export abstract class Minion {
    abstract type: string
    build = (memory: CreepMemory, energy: number) => {
        return {
            body: this.scaleMinion(energy),
            name: `${this.type}${Game.time}`,
            memory: {
                ...memory,
                type: this.type
            }
        }
    }
    abstract scaleMinion(energy: number): BodyPartConstant[]
}
