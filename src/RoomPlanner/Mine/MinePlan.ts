import { MinePlan } from "RoomPlanner";
import { PlannedStructure } from "RoomPlanner/PlannedStructure";
import { getCostMatrix } from "Selectors/MapCoordinates";
import { controllerPosition, mineralPosition } from "Selectors/roomCache";
import { validateMinePlan } from "./validateMinePlan";

export const planMine = (room: string) => {
    const mineralPos = mineralPosition(room);
    if (!mineralPos) throw new Error('No known mineral in room, unable to compute plan')
    const plan: Partial<MinePlan> = {
        extractor: undefined,
        container: undefined,
    }
    // Calculate from scratch
    let controllerPos = controllerPosition(room);
    if (!controllerPos) throw new Error('No known controller in room, unable to compute plan')

    // 1. The Mine containers will be at the first position of the path between the Mineral and the Controller.
    let route = PathFinder.search(
        mineralPos,
        {pos: controllerPos, range: 1},
        {roomCallback: (roomName) => {
            return getCostMatrix(roomName);
        }});
    if (route.incomplete) throw new Error('Unable to calculate path between source and controller');

    plan.container = new PlannedStructure(route.path[0], STRUCTURE_CONTAINER);
    // 2. The Mineral extractor will be on the mineral itself
    plan.extractor = new PlannedStructure(mineralPos, STRUCTURE_EXTRACTOR);

    return validateMinePlan(plan);
}
