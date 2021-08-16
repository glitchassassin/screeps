import { FranchisePlan } from "RoomPlanner";


export function validateFranchisePlan(plan: Partial<FranchisePlan>) {
    if (!plan.sourceId || !plan.spawn || !plan.link || !plan.container // || !plan.ramparts?.length
    ) {
        throw new Error(`Incomplete FranchisePlan`);
    } else {
        return plan as FranchisePlan;
    }
}
