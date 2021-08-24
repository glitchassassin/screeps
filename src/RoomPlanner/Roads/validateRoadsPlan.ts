import { RoadsPlan } from "RoomPlanner";


export function validateRoadsPlan(plan: Partial<RoadsPlan>) {
    if (!plan.roads?.length) {
        throw new Error(`Incomplete RoadsPlan`);
    } else {
        return plan as RoadsPlan;
    }
}
