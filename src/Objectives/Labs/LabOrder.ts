export interface LabOrder {
    ingredient1: ResourceConstant,
    ingredient2: ResourceConstant,
    output: ResourceConstant,
    amount: number,
}
export interface BoostOrder {
    id: Id<Creep>,
    boosts: {type: MineralBoostConstant, count: number}[],
}

declare global {
    interface OfficeMemory {
        lab: {
            orders: LabOrder[],
            boosts: BoostOrder[]
            boostingLabs: {
                id: Id<StructureLab>,
                resource: MineralBoostConstant
            }[]
        }
    }
}
