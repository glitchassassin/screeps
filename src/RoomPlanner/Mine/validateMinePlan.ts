import { MinePlan } from "RoomPlanner";


export function validateMinePlan(plan: Partial<MinePlan>) {
    if (!plan.extractor || !plan.container) {
        throw new Error(`Incomplete MinePlan`);
    } else {
        return plan as MinePlan;
    }
}
