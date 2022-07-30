import { PlannedStructure } from './PlannedStructure';

export interface ExtensionsPlan {
  extensions: PlannedStructure[];
  ramparts: PlannedStructure[];
}

export interface FranchisePlan {
  sourceId: Id<Source>;
  link: PlannedStructure;
  container: PlannedStructure;
  extensions: PlannedStructure[];
  ramparts: PlannedStructure[];
}

export interface RoadsPlan {
  roads: PlannedStructure<STRUCTURE_ROAD>[];
}

export interface HeadquartersPlan {
  nuker: PlannedStructure<STRUCTURE_NUKER>;
  powerSpawn: PlannedStructure<STRUCTURE_POWER_SPAWN>;
  link: PlannedStructure<STRUCTURE_LINK>;
  storage: PlannedStructure<STRUCTURE_STORAGE>;
  extension: PlannedStructure<STRUCTURE_EXTENSION>;
  terminal: PlannedStructure<STRUCTURE_TERMINAL>;
  factory: PlannedStructure<STRUCTURE_FACTORY>;
  roads: PlannedStructure<STRUCTURE_ROAD>[];
}

export interface FastfillerPlan {
  extensions: PlannedStructure<STRUCTURE_EXTENSION>[];
  spawns: PlannedStructure<STRUCTURE_SPAWN>[];
  containers: PlannedStructure<STRUCTURE_CONTAINER>[];
  roads: PlannedStructure<STRUCTURE_ROAD>[];
}

export interface LabsPlan {
  labs: PlannedStructure<STRUCTURE_LAB>[];
  roads: PlannedStructure<STRUCTURE_ROAD>[];
}

export interface MinePlan {
  extractor: PlannedStructure;
  container: PlannedStructure;
}

export interface PerimeterPlan {
  ramparts: PlannedStructure[];
}

export interface BackfillPlan {
  extensions: PlannedStructure<STRUCTURE_EXTENSION>[];
  towers: PlannedStructure<STRUCTURE_TOWER>[];
  ramparts: PlannedStructure<STRUCTURE_RAMPART>[];
}

export interface RoomPlan {
  headquarters?: HeadquartersPlan;
  franchise1?: FranchisePlan;
  franchise2?: FranchisePlan;
  mine?: MinePlan;
  labs?: LabsPlan;
  extensions?: ExtensionsPlan;
  perimeter?: PerimeterPlan;
  roads?: RoadsPlan;
  fastfiller?: FastfillerPlan;
  backfill?: BackfillPlan;
}
