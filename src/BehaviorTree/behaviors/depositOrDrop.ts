import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";
import { Sequence } from "BehaviorTree/Behavior";
import { depositResources } from "./depositResources";
import { dropResources } from "./dropResources";
import { moveTo } from "./moveTo";

export const depositOrDrop = (structure: PlannedStructure, resource?: ResourceConstant) => {
    const range = structure.structure ? 1 : 0
    return Sequence(
        moveTo(structure.pos, range),
        structure.structure ?
            depositResources(structure.structure as AnyStoreStructure, resource) :
            dropResources(resource)
    )
}
