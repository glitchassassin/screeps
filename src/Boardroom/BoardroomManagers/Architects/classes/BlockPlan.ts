import { PlannedStructure } from "./PlannedStructure";

export enum PlanResult {
    PENDING = 'PENDING',
    INPROGRESS = 'INPROGRESS',
    COMPLETE = 'COMPLETE',
    FAILED = 'FAILED'
}



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
            serializedStructures += s.serialize();
        }
        return serializedStructures;
    }
    deserialize(serializedStructures: string) {
        for (let i = 0; i < serializedStructures.length; i += 3) {
            this.structures.push(PlannedStructure.deserialize(serializedStructures.slice(i, i+3)))
        }
    }

    getStructure(structureType: StructureConstant) {
        const structure = this.structures.find(s => s.structureType === structureType);
        if (!structure) throw new Error(`No ${structureType} in plan`)
        return structure
    }
    getStructures(structureType: StructureConstant) {
        const structures = this.structures.filter(s => s.structureType === structureType);
        if (!structures.length) throw new Error(`No ${structureType}s in plan`)
        return structures
    }
}
