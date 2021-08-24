import { LabOrder } from "Structures/Labs/LabOrder";
import { getLabs } from "./getLabs";

export function labsShouldBeEmptied(office: string) {
    const order = Memory.offices[office].labOrders?.find(o => o.amount > 0) as LabOrder|undefined;
    if (!order) return true;
    const { inputs, outputs } = getLabs(office);
    const [lab1, lab2] = inputs.map(s => s.structure) as (StructureLab|undefined)[];

    // Return true if input labs have foreign ingredients, or output labs have an old product
    return (
        Object.keys(lab1?.store ?? {}).some(k => k !== order.ingredient1) ||
        Object.keys(lab2?.store ?? {}).some(k => k !== order.ingredient2) ||
        outputs.some(l => Object.keys((l.structure as StructureLab)?.store ?? {}).some(k => k !== order.output))
    )
}
