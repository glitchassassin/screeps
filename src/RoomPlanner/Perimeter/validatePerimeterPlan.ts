import { PerimeterPlan } from 'RoomPlanner';


export function validatePerimeterPlan(plan: Partial<PerimeterPlan>) {
    if (!plan.ramparts?.length) {
        throw new Error(`Incomplete PerimeterPlan`);
    } else {
        return plan as PerimeterPlan;
    }
}
