import { HeadquartersPlan } from "RoomPlanner";


export function validateHeadquartersPlan(plan: Partial<HeadquartersPlan>) {
    if (!plan.spawn || !plan.link || !plan.factory || !plan.storage || !plan.terminal ||
        !plan.powerSpawn || !plan.towers?.length || !plan.roads?.length || !plan.walls?.length) {
        console.log(JSON.stringify(plan, null, 2))
        throw new Error(`Incomplete HeadquartersPlan`);
    } else {
        return plan as HeadquartersPlan;
    }
}
