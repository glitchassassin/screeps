import { PlannedStructure } from "RoomPlanner/PlannedStructure";

export const serializePlannedStructures = (structures: PlannedStructure[]) => {
    let serializedStructures = '';
    for (let s of structures) {
        serializedStructures += s.serialize();
    }
    return serializedStructures;
}
export const deserializePlannedStructures = (serializedStructures: string) => {
    let structures: PlannedStructure[] = [];
    if (serializedStructures.length < 3) return structures;
    for (let i = 0; i < serializedStructures.length; i += 3) {
        structures.push(PlannedStructure.deserialize(serializedStructures.slice(i, i+3)))
    }
    return structures;
}
