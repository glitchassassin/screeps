import { LabOrder } from "Structures/Labs/LabOrder";
import { getLabs } from "./getLabs";

export function labsShouldBeEmptied(office: string) {
    const order = Memory.offices[office].lab.orders?.find(o => o.amount > 0) as LabOrder|undefined;
    const { inputs, outputs } = getLabs(office);
    const [lab1, lab2] = inputs.map(s => s.structure) as (StructureLab|undefined)[];

    // if no order, and there are resources in labs, then labs should be emptied
    if (!order && [...inputs, ...outputs].some(l => (l.structure as StructureLab|undefined)?.mineralType)) {
        return true;
    } else if (!order) {
        return false
    }

    // Return true if input labs have foreign ingredients, or output labs have an old product
    return (
        (lab1?.mineralType && lab1?.mineralType !== order.ingredient1) ||
        (lab2?.mineralType && lab2?.mineralType !== order.ingredient2) ||
        outputs.some(l => (l.structure as StructureLab|undefined)?.mineralType && (l.structure as StructureLab|undefined)?.mineralType !== order.output)
    )
}
