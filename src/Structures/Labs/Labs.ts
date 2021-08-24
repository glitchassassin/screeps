import { getLabs } from "Selectors/getLabs";

export function runLabs(roomName: string) {
    const order = Memory.offices[roomName].labOrders[0];
    if (!order) return;
    const { inputs, outputs } = getLabs(roomName);
    const [ lab1, lab2 ] = inputs.map(s => s.structure) as (StructureLab|undefined)[]
    if (!lab1?.store.getUsedCapacity(order.ingredient1) || !lab2?.store.getUsedCapacity(order.ingredient2)) return;
    for (let lab of outputs) {
        const result = (lab.structure as StructureLab|undefined)?.runReaction(lab1, lab2)
        // if (result !== undefined) console.log('lab result:', result)
    }
}
