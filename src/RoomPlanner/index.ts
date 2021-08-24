import { PlannedStructure } from "./PlannedStructure";

export interface ExtensionsPlan {
    extensions: PlannedStructure[];
    ramparts: PlannedStructure[];
}

export interface FranchisePlan {
    sourceId: Id<Source>;
    spawn: PlannedStructure;
    link: PlannedStructure;
    container: PlannedStructure;
    extensions: PlannedStructure[];
    ramparts: PlannedStructure[];
}

export interface RoadsPlan {
    roads: PlannedStructure<STRUCTURE_ROAD>[];
}

export interface HeadquartersPlan {
    spawn: PlannedStructure<STRUCTURE_SPAWN>;
    powerSpawn: PlannedStructure<STRUCTURE_POWER_SPAWN>;
    link: PlannedStructure<STRUCTURE_LINK>;
    storage: PlannedStructure<STRUCTURE_STORAGE>;
    terminal: PlannedStructure<STRUCTURE_TERMINAL>;
    factory: PlannedStructure<STRUCTURE_FACTORY>;
    towers: PlannedStructure<STRUCTURE_TOWER>[];
    roads: PlannedStructure<STRUCTURE_ROAD>[];
    walls: PlannedStructure<STRUCTURE_WALL>[];
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

export interface RoomPlan {
    headquarters?: HeadquartersPlan,
    franchise1?: FranchisePlan,
    franchise2?: FranchisePlan,
    mine?: MinePlan,
    labs?: LabsPlan,
    extensions?: ExtensionsPlan,
    perimeter?: PerimeterPlan,
    roads?: RoadsPlan
}
