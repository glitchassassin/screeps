import { ExtensionsPlan } from "RoomPlanner";


export function validateExtensionsPlan(plan: Partial<ExtensionsPlan>) {
    if (plan.extensions?.length !== 60) {
        throw new Error(`Incomplete ExtensionsPlan`);
    } else {
        return plan as ExtensionsPlan;
    }
}
