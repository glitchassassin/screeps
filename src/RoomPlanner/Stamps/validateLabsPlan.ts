import { LabsPlan } from "RoomPlanner";


export function validateLabsPlan(plan: Partial<LabsPlan>) {
    if (plan.labs?.length !== 10 || !plan.roads?.length) {
        throw new Error(`Incomplete LabsPlan`);
    } else {
        return plan as LabsPlan;
    }
}
