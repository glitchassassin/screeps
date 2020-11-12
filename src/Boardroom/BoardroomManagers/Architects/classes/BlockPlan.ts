import { packPos, unpackPos } from "utils/packrat";

import { PlannedStructure } from "./PlannedStructure";

export enum PlanResult {
    PENDING = 'PENDING',
    INPROGRESS = 'INPROGRESS',
    COMPLETE = 'COMPLETE',
    FAILED = 'FAILED'
}

const PackedStructureTypes: Record<BuildableStructureConstant, string> = {
    [STRUCTURE_CONTAINER]:      'a',
    [STRUCTURE_EXTENSION]:      'b',
    [STRUCTURE_EXTRACTOR]:      'c',
    [STRUCTURE_FACTORY]:        'd',
    [STRUCTURE_LAB]:            'e',
    [STRUCTURE_LINK]:           'f',
    [STRUCTURE_NUKER]:          'g',
    [STRUCTURE_OBSERVER]:       'h',
    [STRUCTURE_POWER_SPAWN]:    'i',
    [STRUCTURE_RAMPART]:        'j',
    [STRUCTURE_ROAD]:           'k',
    [STRUCTURE_SPAWN]:          'l',
    [STRUCTURE_STORAGE]:        'm',
    [STRUCTURE_TERMINAL]:       'n',
    [STRUCTURE_TOWER]:          'o',
    [STRUCTURE_WALL]:           'p',
}
// Lookup table is the same, but inverted, generated once
const PackedStructureTypesLookup: Record<string, BuildableStructureConstant> = Object.entries(PackedStructureTypes).reduce(
    (net, [k, v]) => {
        net[v] = k as BuildableStructureConstant;
        return net;
    }, {} as Record<string, BuildableStructureConstant>
)

export class BlockPlan {
    structures: PlannedStructure[] = [];
    result: PlanResult = PlanResult.PENDING;

    survey() {
        let complete = 0;
        for (let s of this.structures) {
            if (s.survey()) complete++;
        }
        if (complete === this.structures.length) this.result = PlanResult.COMPLETE;
        if (complete > 0) this.result = PlanResult.INPROGRESS;
    }

    visualize() {
        for (let s of this.structures) {
            s.visualize();
        }
    }

    serialize() {
        let serializedStructures = '';
        for (let s of this.structures) {
            serializedStructures += PackedStructureTypes[s.structureType] + packPos(s.pos);
        }
        return serializedStructures;
    }
    deserialize(serializedStructures: string) {
        for (let i = 0; i < serializedStructures.length; i += 3) {
            let structureType = PackedStructureTypesLookup[serializedStructures.slice(i, i+1)]
            let pos = unpackPos(serializedStructures.slice(i+1, i+3))
            this.structures.push(new PlannedStructure(pos, structureType))
        }
    }
}
