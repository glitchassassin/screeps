import { plannedOfficeStructuresByRcl } from "./plannedStructuresByRcl";

export const costMatrixFromRoomPlan = (room: string) => {
    const plan = new PathFinder.CostMatrix;
    for (const s of plannedOfficeStructuresByRcl(room, 8)) {
        if ((OBSTACLE_OBJECT_TYPES as string[]).includes(s.structureType)) {
            plan.set(s.pos.x, s.pos.y, 255)
        }
    }
    return plan;
}
