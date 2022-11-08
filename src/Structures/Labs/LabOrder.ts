export interface LabOrder {
  ingredient1: LabMineralConstant;
  ingredient2: LabMineralConstant;
  output: LabMineralConstant;
  amount: number;
}
export interface BoostOrder {
  name: string;
  boosts: { type: MineralBoostConstant; count: number }[];
}

export type LabMineralConstant = MineralCompoundConstant | MineralConstant;

declare global {
  interface OfficeMemory {
    lab: {
      orders: LabOrder[];
      boosts: BoostOrder[];
      boostingLabs: {
        id: Id<StructureLab>;
        resource: MineralBoostConstant;
      }[];
    };
  }
}
