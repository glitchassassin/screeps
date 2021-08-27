export interface LabOrder {
    ingredient1: ResourceConstant,
    ingredient2: ResourceConstant,
    output: ResourceConstant,
    amount: number,
}

declare global {
    interface OfficeMemory {
        labOrders: LabOrder[]
    }
}
