import { BehaviorResult } from "BehaviorTree/Behavior";
import { Controllers } from "WorldState/Controllers";
import { Office } from "Office/Office";

export const isRclGreaterThan = (level: number) => (office: Office) => {
    let controller = Controllers.byRoom(office.center.name);

    if (controller && controller.level > level) {
        return BehaviorResult.SUCCESS;
    }

    return BehaviorResult.FAILURE;
}
