import { BehaviorResult, Blackboard } from "BehaviorTree/Behavior";

import { PlannedStructure } from "Boardroom/BoardroomManagers/Architects/classes/PlannedStructure";
import { log } from "utils/logger";
import { structureNeedsRepairs } from "Selectors/structureNeedsRepairs";

/**
 * Returns FAILURE if health is unavailable, target is unavailable, or there is another error
 * Returns SUCCESS if health is greater than or equal to the target level
 * Returns INPROGRESS if repair command is successful
 */
export const repairStructure = (structure?: PlannedStructure, repairToHits?: number) => (creep: Creep, bb: Blackboard) => {
    if (!structure?.survey()) return BehaviorResult.FAILURE;

    if (!structureNeedsRepairs(structure, repairToHits)) return BehaviorResult.SUCCESS;

    log(creep.name, `target ${structure.structure?.pos} (${structure.structure?.structureType})`)
    if (!structure.structure) return BehaviorResult.FAILURE;

    let result = creep.repair(structure.structure as Structure);
    log(creep.name, `result ${result}`)
    if (result === OK) return BehaviorResult.INPROGRESS;
    return BehaviorResult.FAILURE;
}
